import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { authenticator } from "otplib";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/auditLog.js";
import { isEmailConfigured, sendEmail } from "../services/email/sendEmail.js";
import { buildCbsEmailTemplate, emailButton, emailParagraph } from "../services/email/templates.js";

export const authRouter = express.Router();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "change-me";
  if (process.env.NODE_ENV === "production" && secret === "change-me") {
    throw new Error("JWT_SECRET must be configured in production");
  }
  return secret;
};

// Local (email/password) login is disabled once AD/SSO is live - every login must go through
// miniOrange (AD credentials + OTP), no exceptions. Kept behind an env flag rather than deleted
// so it can be switched back on quickly (e.g. LOCAL_LOGIN_ENABLED=true) if miniOrange is ever
// unavailable and CBS needs a break-glass path, the same way T24's contingency plan works.
const isLocalLoginEnabled = () =>
  ["1", "true", "yes", "on"].includes(String(process.env.LOCAL_LOGIN_ENABLED ?? "true").trim().toLowerCase());

const requireLocalLoginEnabled = (req, res, next) => {
  if (!isLocalLoginEnabled()) {
    return res.status(403).json({ error: "Local sign-in is disabled. Please use Login with AD / SSO." });
  }
  next();
};

const getUserRoles = async (userId) => {
  const [userRows] = await pool.query("SELECT role FROM users WHERE id = ? LIMIT 1", [userId]);
  const userRoleRaw = userRows?.[0]?.role;
  if (userRoleRaw) {
    const cleaned = String(userRoleRaw || "").trim().toLowerCase();
    if (cleaned === "admin" || cleaned === "sys_admin" || cleaned === "systemadmin") return ["sysadmin"];
    if (cleaned === "employee" || cleaned === "student" || cleaned === "normal_user") return ["learner"];
    if (cleaned === "hr" || cleaned === "supervisor" || cleaned === "teacher") return ["instructor"];
    if (cleaned === "manager") return ["manager"];
    if (cleaned === "sysadmin" || cleaned === "instructor" || cleaned === "learner") return [cleaned];
  }

  const [rows] = await pool.query("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
  return rows.map((r) => {
    const cleaned = String(r.role || "").trim().toLowerCase();
    if (cleaned === "admin" || cleaned === "sys_admin" || cleaned === "systemadmin") return "sysadmin";
    if (cleaned === "employee" || cleaned === "student" || cleaned === "normal_user") return "learner";
    if (cleaned === "hr" || cleaned === "supervisor" || cleaned === "teacher") return "instructor";
    if (cleaned === "manager") return "manager";
    return cleaned;
  });
};

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const buildPasswordResetHtml = (link) =>
  buildCbsEmailTemplate({
    title: "Reset your CBS Staff LMS password",
    preview: "Use this secure link to choose a new password.",
    body: `
      ${emailParagraph("Hello,")}
      ${emailParagraph("Your CBS Staff LMS password reset was requested. Use the secure button below to choose a new password.")}
      ${emailButton(link, "Reset password")}
      ${emailParagraph("This link can be used once and will expire. If you did not request it, you can ignore this email.")}
    `,
  });

// extraClaims currently only carries `{ sso: { nameID, nameIDFormat, sessionIndex } }` for
// SSO-originated logins, so /api/auth/sso/logout can later build a SAML LogoutRequest without
// needing server-side session storage.
export const issueAuthToken = async (userRow, extraClaims = {}) => {
  const roles = await getUserRoles(userRow.id);
  const safeRoles = roles.length ? roles : ["learner"];
  const token = jwt.sign({ sub: userRow.id, roles: safeRoles, ...extraClaims }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  return { token, user: { id: userRow.id, email: userRow.email, full_name: userRow.full_name, roles: safeRoles } };
};

const findUserForLogin = async (identifierRaw) => {
  const trimmed = String(identifierRaw || "").trim();
  if (!trimmed) return null;
  const emailLower = trimmed.toLowerCase();

  // users.username is the AD/miniOrange login name (distinct from profiles.employee_id, which is
  // the internal CBS employee code). Try matching against it first; if the column hasn't been
  // added yet (run back-end/sql/add_users_username.sql), fall back to email/employee_id only.
  const withUsername = `
    SELECT u.id, u.email, u.password_hash, u.full_name, COALESCE(u.mfa_enabled, 0) AS mfa_enabled, u.mfa_secret
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE (LOWER(TRIM(u.email)) = ? AND u.email IS NOT NULL)
       OR (u.username IS NOT NULL AND LOWER(TRIM(u.username)) = ?)
       OR (p.employee_id IS NOT NULL AND LOWER(TRIM(p.employee_id)) = ?)
    LIMIT 1
  `;
  const withoutUsername = `
    SELECT u.id, u.email, u.password_hash, u.full_name, COALESCE(u.mfa_enabled, 0) AS mfa_enabled, u.mfa_secret
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE (LOWER(TRIM(u.email)) = ? AND u.email IS NOT NULL)
       OR (p.employee_id IS NOT NULL AND LOWER(TRIM(p.employee_id)) = ?)
    LIMIT 1
  `;
  const withoutMfaCols = `
    SELECT u.id, u.email, u.password_hash, u.full_name, 0 AS mfa_enabled, NULL AS mfa_secret
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE (LOWER(TRIM(u.email)) = ? AND u.email IS NOT NULL)
       OR (p.employee_id IS NOT NULL AND LOWER(TRIM(p.employee_id)) = ?)
    LIMIT 1
  `;

  const isMissingColumn = (err) => err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "ER_NO_SUCH_COLUMN";

  try {
    const [rows] = await pool.query(withUsername, [emailLower, emailLower, emailLower]);
    return rows[0] || null;
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    try {
      const [rows] = await pool.query(withoutUsername, [emailLower, emailLower]);
      return rows[0] || null;
    } catch (err2) {
      if (!isMissingColumn(err2)) throw err2;
      const [rows] = await pool.query(withoutMfaCols, [emailLower, emailLower]);
      return rows[0] || null;
    }
  }
};

authRouter.post("/register", requireLocalLoginEnabled, async (req, res) => {
  try {
    const { email, password, full_name } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: "email, password, full_name are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const requestedRole = "learner";

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(String(password), 10);

    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)",
      [normalizedEmail, passwordHash, full_name, requestedRole, 1],
    );

    const userId = result.insertId;

    await pool.query("INSERT INTO profiles (user_id, full_name) VALUES (?, ?)", [userId, full_name]);

    await pool.query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [userId, requestedRole]);

    return res.status(201).json({ id: userId });
  } catch (err) {
    console.error("[auth/register] error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", requireLocalLoginEnabled, async (req, res) => {
  try {
    const { email, password, mfa_code } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = await findUserForLogin(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const mfaOn = Number(user.mfa_enabled) === 1 && user.mfa_secret;
    if (mfaOn) {
      if (mfa_code) {
        const valid = authenticator.verify({ token: String(mfa_code).replace(/\s/g, ""), secret: user.mfa_secret });
        if (!valid) return res.status(401).json({ error: "Invalid authenticator code" });
      } else {
        const mfa_token = jwt.sign({ sub: user.id, step: "mfa" }, getJwtSecret(), { expiresIn: "10m" });
        return res.json({ mfa_required: true, mfa_token });
      }
    }

    const out = await issueAuthToken(user);
    return res.json(out);
  } catch (err) {
    console.error("[auth/login] error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/login/mfa", requireLocalLoginEnabled, async (req, res) => {
  try {
    const { mfa_token, mfa_code } = req.body || {};
    if (!mfa_token || !mfa_code) {
      return res.status(400).json({ error: "mfa_token and mfa_code are required" });
    }
    let payload;
    try {
      payload = jwt.verify(mfa_token, getJwtSecret());
    } catch {
      return res.status(401).json({ error: "Invalid or expired MFA token" });
    }
    if (payload?.step !== "mfa" || !payload.sub) {
      return res.status(401).json({ error: "Invalid MFA token" });
    }
    const userId = Number(payload.sub);
    let rows;
    try {
      const [withMfaCols] = await pool.query(
        "SELECT id, email, full_name, COALESCE(mfa_enabled, 0) AS mfa_enabled, mfa_secret FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      rows = withMfaCols;
    } catch (err) {
      if (err?.code !== "ER_BAD_FIELD_ERROR" && err?.code !== "ER_NO_SUCH_COLUMN") {
        throw err;
      }
      const [withoutMfaCols] = await pool.query(
        "SELECT id, email, full_name, 0 AS mfa_enabled, NULL AS mfa_secret FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      rows = withoutMfaCols;
    }
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
    const user = rows[0];
    if (!user.mfa_secret || !Number(user.mfa_enabled)) {
      return res.status(400).json({ error: "MFA is not enabled for this account" });
    }
    const valid = authenticator.verify({ token: String(mfa_code).replace(/\s/g, ""), secret: user.mfa_secret });
    if (!valid) return res.status(401).json({ error: "Invalid authenticator code" });

    const out = await issueAuthToken(user);
    return res.json(out);
  } catch (err) {
    console.error("[auth/login/mfa] error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });
    const normalizedEmail = String(email).trim().toLowerCase();
    const [users] = await pool.query("SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1", [normalizedEmail]);

    const generic = { ok: true, message: "If an account exists for that email, reset instructions were sent." };

    if (!users.length) return res.json(generic);

    const userId = users[0].id;
    const plain = randomBytes(32).toString("hex");
    const tokenHash = sha256(plain);
    const hours = Number(process.env.PASSWORD_RESET_HOURS || 1);
    const expires = new Date(Date.now() + hours * 60 * 60 * 1000);

    try {
      await pool.query("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [userId]);
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [userId, tokenHash, expires],
      );
    } catch (e) {
      if (e?.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ error: "Password reset is not configured. Run brd_extended_schema.sql." });
      }
      throw e;
    }

    const base = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const link = `${base.replace(/\/$/, "")}/auth/reset?token=${plain}`;

    if (process.env.NODE_ENV !== "production" || process.env.DEBUG_PASSWORD_RESET === "true") {
      console.info("[auth/forgot-password] reset link (dev only):", link);
    }

    if (isEmailConfigured()) {
      await sendEmail({
        to: normalizedEmail,
        subject: "Reset your CBS Staff LMS password",
        html: buildPasswordResetHtml(link),
        text: `Reset your CBS Staff LMS password: ${link}`,
      });
    }

    await writeAudit({ actorUserId: userId, action: "password_reset_requested", entityType: "user", entityId: userId });

    const body = { ...generic };
    if (process.env.DEBUG_PASSWORD_RESET === "true") {
      body.debug_reset_link = link;
    }
    return res.json(body);
  } catch (err) {
    console.error("[auth/forgot-password] error:", err);
    return res.status(500).json({ error: "Request failed" });
  }
});

authRouter.get("/reset-password/validate", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "token is required" });

    const tokenHash = sha256(String(token));
    const [rows] = await pool.query(
      `
        SELECT id FROM password_resets
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
      `,
      [tokenHash],
    );

    return res.json({ valid: rows.length > 0 });
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ error: "Password reset is not configured." });
    }
    console.error("[auth/reset-password/validate] error:", err);
    return res.status(500).json({ error: "Validation failed" });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: "token and password are required" });
    if (String(password).length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

    const tokenHash = sha256(String(token));
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT * FROM password_resets
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const rec = rows[0];
    const passwordHash = await bcrypt.hash(String(password), 10);
    await conn.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, rec.user_id]);
    await conn.query("UPDATE password_resets SET used_at = NOW() WHERE id = ? AND used_at IS NULL", [rec.id]);
    await conn.commit();

    await writeAudit({ actorUserId: rec.user_id, action: "password_reset_completed", entityType: "user", entityId: rec.user_id });

    return res.json({ ok: true });
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ error: "Password reset is not configured." });
    }
    await conn.rollback().catch(() => {});
    console.error("[auth/reset-password] error:", err);
    return res.status(500).json({ error: "Reset failed" });
  } finally {
    conn.release();
  }
});

authRouter.get("/me", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      "SELECT email, COALESCE(mfa_enabled, 0) AS mfa_enabled FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    if (err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "ER_NO_SUCH_COLUMN") {
      return res.json({ data: { email: null, mfa_enabled: 0 } });
    }
    console.error("[auth/me] error:", err);
    return res.status(500).json({ error: "Failed" });
  }
});

authRouter.get("/mfa/setup", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [emRows] = await pool.query("SELECT email FROM users WHERE id = ? LIMIT 1", [userId]);
    const email = emRows[0]?.email || "user";
    const secret = authenticator.generateSecret();
    const otpauth_url = authenticator.keyuri(email, "CBS Staff LMS", secret);
    return res.json({ secret, otpauth_url });
  } catch (err) {
    console.error("[auth/mfa/setup] error:", err);
    return res.status(500).json({ error: "Failed to generate secret" });
  }
});

authRouter.post("/mfa/enable", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { secret, mfa_code } = req.body || {};
    if (!secret || !mfa_code) return res.status(400).json({ error: "secret and mfa_code are required" });
    const valid = authenticator.verify({ token: String(mfa_code).replace(/\s/g, ""), secret: String(secret) });
    if (!valid) return res.status(400).json({ error: "Invalid authenticator code" });

    await pool.query("UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?", [secret, userId]);
    await writeAudit({ actorUserId: userId, action: "mfa_enabled", entityType: "user", entityId: userId });
    return res.json({ ok: true });
  } catch (err) {
    if (err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "ER_NO_SUCH_COLUMN") {
      return res.status(503).json({ error: "Run brd_extended_schema.sql to add MFA columns." });
    }
    console.error("[auth/mfa/enable] error:", err);
    return res.status(500).json({ error: "Failed to enable MFA" });
  }
});

authRouter.post("/mfa/disable", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "password is required" });

    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(String(password), rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    await pool.query("UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?", [userId]);
    await writeAudit({ actorUserId: userId, action: "mfa_disabled", entityType: "user", entityId: userId });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[auth/mfa/disable] error:", err);
    return res.status(500).json({ error: "Failed to disable MFA" });
  }
});
