import express from "express";
import {
  passport,
  isSamlConfigured,
  getServiceProviderMetadata,
  findOrCreateSsoUser,
  findLmsUserBySsoIdentifier,
} from "../services/sso/saml.js";
import { issueAuthToken } from "./auth.js";

export const ssoRouter = express.Router();

const clientOrigin = () => (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, "");

// Encode the safe user object the same way SsoCallback.tsx decodes it (base64url, no padding).
const base64url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/**
 * SP metadata miniOrange imports when setting up the LMS application.
 */
ssoRouter.get("/metadata", (req, res) => {
  res.type("application/xml").send(getServiceProviderMetadata());
});

/**
 * Entry point the "Login with AD / SSO" button redirects to. Starts the SAML flow with miniOrange.
 */
ssoRouter.get("/login", (req, res, next) => {
  if (!isSamlConfigured()) {
    return res.status(503).json({ error: "SSO is not configured. Set SAML_ENTRY_POINT, SAML_SP_ENTITY_ID and SAML_CERT." });
  }
  return passport.authenticate("saml", { session: false })(req, res, next);
});

/**
 * ACS endpoint miniOrange posts the SAML response back to after AD + MFA succeed.
 */
ssoRouter.post("/callback", express.urlencoded({ extended: false }), (req, res, next) => {
  if (!isSamlConfigured()) {
    return res.redirect(`${clientOrigin()}/auth?error=sso_not_configured`);
  }

  passport.authenticate("saml", { session: false }, async (err, profile) => {
    if (err || !profile) {
      console.error("[sso/callback] SAML authentication failed:", err?.message || "no profile returned");
      return res.redirect(`${clientOrigin()}/auth?error=sso_failed`);
    }

    try {
      const user = await findOrCreateSsoUser(profile);
      const { token, user: safeUser } = await issueAuthToken(user);
      const encodedUser = base64url(safeUser);
      return res.redirect(`${clientOrigin()}/sso/callback#token=${encodeURIComponent(token)}&user=${encodedUser}`);
    } catch (e) {
      console.error("[sso/callback] login error:", e.message);
      return res.redirect(`${clientOrigin()}/auth?error=${encodeURIComponent(e.message || "sso_failed")}`);
    }
  })(req, res, next);
});

/**
 * miniOrange calls this BEFORE issuing OTP/MFA, to confirm the AD username is also a known LMS
 * account (mirrors the ERP/T24-style pre-check). Protect it with SSO_PRECHECK_SECRET so it can't
 * be used to enumerate LMS accounts from the internet.
 */
ssoRouter.post("/precheck", express.json(), async (req, res) => {
  try {
    const configuredSecret = process.env.SSO_PRECHECK_SECRET;

    if (!configuredSecret && process.env.NODE_ENV === "production") {
      console.error("[sso/precheck] SSO_PRECHECK_SECRET is not configured in production.");
      return res.status(503).json({ error: "SSO precheck is not configured" });
    }

    if (configuredSecret) {
      const provided = req.headers["x-precheck-secret"] || req.body?.secret;
      if (!provided || provided !== configuredSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } else {
      console.warn("[sso/precheck] SSO_PRECHECK_SECRET is not set - this endpoint is currently unauthenticated.");
    }

    const username = String(req.body?.username || req.body?.sAMAccountName || "").trim().toLowerCase();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!username && !email) {
      return res.status(400).json({ error: "username or email is required" });
    }

    const user = await findLmsUserBySsoIdentifier({ email, username });
    const allowed = Boolean(user) && Number(user?.is_active) !== 0;
    return res.json({ allowed });
  } catch (err) {
    console.error("[sso/precheck] error:", err);
    return res.status(500).json({ allowed: false, error: "Precheck failed" });
  }
});
