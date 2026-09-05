import passport from "passport";
import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { pool } from "../../db/pool.js";

const ROLE_WHITELIST = new Set(["sysadmin", "instructor", "manager", "learner"]);

const normalizeRole = (role) => {
  const cleaned = String(role || "").trim().toLowerCase();
  if (cleaned === "admin" || cleaned === "sys_admin" || cleaned === "systemadmin") return "sysadmin";
  if (cleaned === "employee" || cleaned === "student" || cleaned === "normal_user") return "learner";
  if (cleaned === "hr" || cleaned === "supervisor" || cleaned === "teacher") return "instructor";
  if (cleaned === "manager") return "manager";
  if (ROLE_WHITELIST.has(cleaned)) return cleaned;
  return "";
};

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const certToPem = (cert) => {
  const value = String(cert || "").trim();
  if (!value || value.includes("BEGIN CERTIFICATE")) return value;
  const compact = value.replace(/\s+/g, "");
  const lines = compact.match(/.{1,64}/g) || [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
};

const firstValue = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value[0];
    if (value) return value;
  }
  return "";
};

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeIdentifier = (value) => String(value || "").trim().toLowerCase();

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(toArray);
  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const isSamlConfigured = () =>
  Boolean(process.env.SAML_ENTRY_POINT && (process.env.SAML_SP_ENTITY_ID || process.env.SAML_ISSUER) && process.env.SAML_CERT);

export const getSamlConfig = () => {
  const callbackUrl =
    process.env.SAML_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/auth/sso/callback`;
  const issuer = process.env.SAML_SP_ENTITY_ID || process.env.SAML_ISSUER;

  return {
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer,
    callbackUrl,
    idpCert: certToPem(process.env.SAML_CERT),
    idpIssuer: process.env.SAML_IDP_ENTITY_ID || undefined,
    identifierFormat: process.env.SAML_NAME_ID_FORMAT || "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    acceptedClockSkewMs: Number(process.env.SAML_ACCEPTED_CLOCK_SKEW_MS || 300000),
    disableRequestedAuthnContext: true,
    // miniOrange signs the <Response> element, not the <Assertion> individually - the library
    // defaults to requiring an assertion-level signature (DEFAULT_WANT_ASSERTIONS_SIGNED = true
    // in @node-saml/node-saml), which fails with a generic "Invalid signature" even though the
    // actual Response signature is valid. The Response signature already covers the assertion
    // content, so this is a legitimate configuration, not a security downgrade.
    wantAssertionsSigned: false,
    // Single Logout endpoint published in miniOrange's IdP metadata for this broker app
    // (<md:SingleLogoutService>). Without this, node-saml falls back to sending LogoutRequests
    // to the *login* entryPoint, which miniOrange won't accept as a logout. Sign-out only ends
    // the LMS's own session unless this is set - the AD/miniOrange session stays alive and a
    // fresh SSO redirect will silently re-authenticate the user without prompting again.
    logoutUrl: process.env.SAML_LOGOUT_URL || undefined,
  };
};

export const getServiceProviderMetadata = () => {
  const callbackUrl =
    process.env.SAML_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/auth/sso/callback`;
  const entityId =
    process.env.SAML_SP_ENTITY_ID ||
    process.env.SAML_ISSUER ||
    `http://localhost:${process.env.PORT || 5000}/api/auth/sso/metadata`;
  const nameIdFormat =
    process.env.SAML_NAME_ID_FORMAT ||
    "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${escapeXml(entityId)}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>${escapeXml(nameIdFormat)}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${escapeXml(callbackUrl)}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
};

export const getSamlProfile = (profile = {}) => {
  const rawEmail = firstValue(
    // "emailaddress" (all lowercase) is the literal attribute name CBS's miniOrange IdP is
    // confirmed to send today for other SP integrations (Vision SupTech/DQ/Studio) - see
    // CBS_SAML_SSO_Requests.pdf. Check it first, then fall back to other common spellings.
    profile.emailaddress,
    profile.email,
    profile.mail,
    profile.Email,
    profile.emailAddress,
    profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
  );
  const rawNameId = firstValue(profile.nameID, profile.nameId, profile.NameID);
  const email = normalizeIdentifier(looksLikeEmail(rawEmail) ? rawEmail : looksLikeEmail(rawNameId) ? rawNameId : "");

  const fullName = firstValue(
    profile.displayName,
    profile.cn,
    profile.name,
    profile.fullName,
    profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    email,
  ).trim();

  const username = normalizeIdentifier(firstValue(
    // "givenname" (all lowercase) is the literal attribute CBS's miniOrange IdP is confirmed to
    // send today as the "User Login ID of the user" for other SP integrations - see
    // CBS_SAML_SSO_Requests.pdf. Check it first, then fall back to other common spellings.
    profile.givenname,
    profile.givenName,
    profile.username,
    profile.userName,
    profile.UserName,
    profile.uid,
    profile.sAMAccountName,
    profile.samaccountname,
    profile["sAMAccountName"],
    profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    rawNameId,
    email ? email.split("@")[0] : "",
  ));

  const groups = toArray(
    firstValue(
      profile.groups,
      profile.group,
      profile.memberOf,
      profile.roles,
      profile.role,
      profile["http://schemas.xmlsoap.org/claims/Group"],
      profile["http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"],
      profile["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
    ),
  );

  return { email, fullName, username, groups, raw: profile };
};

const envList = (name) =>
  String(process.env[name] || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const autoCreateSsoUsers = () =>
  ["1", "true", "yes", "on"].includes(String(process.env.SSO_AUTO_CREATE_USERS || "false").trim().toLowerCase());

export const findLmsUserBySsoIdentifier = async ({ email, username }) => {
  const buildQuery = (includeUsernameColumn) => {
    const params = [];
    const conditions = [];
    if (email) {
      conditions.push("LOWER(TRIM(u.email)) = ?");
      params.push(email);
    }
    if (username) {
      if (includeUsernameColumn) {
        conditions.push("(u.username IS NOT NULL AND LOWER(TRIM(u.username)) = ?)");
        params.push(username);
      }
      conditions.push("LOWER(SUBSTRING_INDEX(TRIM(u.email), '@', 1)) = ?");
      conditions.push("LOWER(TRIM(p.employee_id)) = ?");
      params.push(username, username);
    }
    if (!conditions.length) return null;
    return {
      sql: `
        SELECT u.id, u.email, u.full_name, u.role, u.is_active
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE ${conditions.join(" OR ")}
        LIMIT 1
      `,
      params,
    };
  };

  // users.username is the AD/miniOrange login name (distinct from profiles.employee_id, which is
  // the internal CBS employee code). Try matching against it first; if the column hasn't been
  // added yet (run back-end/sql/add_users_username.sql), fall back to email/employee_id only.
  const primary = buildQuery(true);
  if (!primary) return null;

  try {
    const [rows] = await pool.query(primary.sql, primary.params);
    return rows[0] || null;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR" && err?.code !== "ER_NO_SUCH_COLUMN") throw err;
    const fallback = buildQuery(false);
    const [rows] = await pool.query(fallback.sql, fallback.params);
    return rows[0] || null;
  }
};

export const roleFromSamlGroups = (groups) => {
  const normalizedGroups = groups.map((group) => group.toLowerCase());
  const mappings = [
    ["sysadmin", envList("SSO_ADMIN_GROUPS")],
    ["instructor", envList("SSO_INSTRUCTOR_GROUPS")],
    ["manager", envList("SSO_MANAGER_GROUPS")],
    ["learner", envList("SSO_LEARNER_GROUPS")],
  ];

  for (const [role, expectedGroups] of mappings) {
    if (expectedGroups.some((expected) => normalizedGroups.includes(expected))) return role;
  }

  return normalizeRole(process.env.SSO_DEFAULT_ROLE) || "learner";
};

const buildEmailForUsername = (username) => {
  const domain = String(process.env.SSO_EMAIL_DOMAIN || "").trim().replace(/^@/, "");
  if (!username || !domain) return "";
  return `${username}@${domain}`.toLowerCase();
};

export const findOrCreateSsoUser = async ({ email, username, fullName, groups }) => {
  if (!email && !username) throw new Error("miniOrange did not send an email or AD username for this user");

  const user = await findLmsUserBySsoIdentifier({ email, username });
  if (user) {
    if (Number(user.is_active) === 0) throw new Error("This LMS account is disabled");
    return user;
  }

  if (!autoCreateSsoUsers()) {
    throw new Error("Invalid username or password");
  }

  const role = roleFromSamlGroups(groups);
  const userEmail = email || buildEmailForUsername(username);
  if (!userEmail) {
    throw new Error("miniOrange sent username only. Set SSO_EMAIL_DOMAIN or ask miniOrange to send email.");
  }
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const name = fullName || username || userEmail;
  const [result] = await pool.query(
    "INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)",
    [userEmail, passwordHash, name, role, 1],
  );
  const userId = result.insertId;

  await pool.query("INSERT INTO profiles (user_id, full_name, employee_id) VALUES (?, ?, ?)", [userId, name, username || null]);
  await pool.query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [userId, role]);

  return { id: userId, email: userEmail, full_name: name, role, is_active: 1 };
};

// Held onto so routes/sso.js can call .logout() to build a Single Logout redirect URL - passport
// itself has no API to fetch a registered strategy instance back out.
let samlStrategyInstance = null;

export const configureSamlPassport = () => {
  if (!isSamlConfigured()) return false;
  samlStrategyInstance = new SamlStrategy(getSamlConfig(), (profile, done) => {
    done(null, getSamlProfile(profile));
  });
  passport.use("saml", samlStrategyInstance);
  return true;
};

export const getSamlStrategy = () => samlStrategyInstance;

export { passport };
