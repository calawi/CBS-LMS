import express from "express";
import {
  passport,
  isSamlConfigured,
  getServiceProviderMetadata,
  findOrCreateSsoUser,
  findLmsUserBySsoIdentifier,
  getSamlStrategy,
} from "../services/sso/saml.js";
import { issueAuthToken } from "./auth.js";
import { requireAuth } from "../middleware/auth.js";

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

// Temporary diagnostic aid for the "Invalid signature" issue - logs the raw SAML response
// miniOrange actually sent so it can be inspected directly instead of guessing. Gated behind an
// env flag since it's verbose and the payload contains identity attributes. Remove once the
// signature issue is resolved with miniOrange.
const logRawSamlResponseIfEnabled = (req) => {
  if (String(process.env.SSO_DEBUG_LOG || "").toLowerCase() !== "true") return;
  try {
    const raw = req.body?.SAMLResponse;
    if (!raw) {
      console.info("[sso/callback][debug] POST received with no SAMLResponse field in the body");
      return;
    }
    const xml = Buffer.from(raw, "base64").toString("utf8");
    console.info("[sso/callback][debug] Raw SAMLResponse XML:\n" + xml);
  } catch (e) {
    console.error("[sso/callback][debug] Failed to decode SAMLResponse for logging:", e.message);
  }
};

/**
 * ACS endpoint miniOrange posts the SAML response back to after AD + MFA succeed.
 */
ssoRouter.post("/callback", express.urlencoded({ extended: false }), (req, res, next) => {
  if (!isSamlConfigured()) {
    return res.redirect(`${clientOrigin()}/auth?error=sso_not_configured`);
  }

  logRawSamlResponseIfEnabled(req);

  passport.authenticate("saml", { session: false }, async (err, profile) => {
    if (err || !profile) {
      console.error("[sso/callback] SAML authentication failed:", err?.message || "no profile returned");
      if (err && String(process.env.SSO_DEBUG_LOG || "").toLowerCase() === "true") {
        console.error("[sso/callback][debug] Full error:", err);
      }
      return res.redirect(`${clientOrigin()}/auth?error=sso_failed`);
    }

    try {
      const user = await findOrCreateSsoUser(profile);

      // Carry the SAML session identifiers through to the JWT so a later call to
      // /api/auth/sso/logout can build a LogoutRequest without needing server-side session
      // storage. profile.raw is node-saml's own parsed profile object.
      const rawProfile = profile.raw || {};
      const ssoClaims = rawProfile.nameID
        ? {
            sso: {
              nameID: rawProfile.nameID,
              nameIDFormat: rawProfile.nameIDFormat,
              sessionIndex: rawProfile.sessionIndex,
            },
          }
        : {};

      const { token, user: safeUser } = await issueAuthToken(user, ssoClaims);
      const encodedUser = base64url(safeUser);
      return res.redirect(`${clientOrigin()}/sso/callback#token=${encodeURIComponent(token)}&user=${encodedUser}`);
    } catch (e) {
      console.error("[sso/callback] login error:", e.message);
      return res.redirect(`${clientOrigin()}/auth?error=${encodeURIComponent(e.message || "sso_failed")}`);
    }
  })(req, res, next);
});

/**
 * Called by the "Sign out" button before clearing the local session. If the caller logged in via
 * SSO, builds a SAML LogoutRequest redirect URL so miniOrange's own broker session ends too -
 * without this, clearing only the LMS's local token leaves the user's miniOrange/AD session
 * alive, so a later visit to /auth silently re-authenticates them without prompting again.
 * Returns { logoutUrl: null } for local-password logins (nothing to do on miniOrange's side).
 */
ssoRouter.post("/logout", requireAuth(), (req, res) => {
  const strategy = getSamlStrategy();
  const ssoSession = req.user?.sso;

  if (!strategy || !ssoSession?.nameID) {
    return res.json({ logoutUrl: null });
  }

  strategy.logout({ user: ssoSession, query: {}, body: {} }, (err, url) => {
    if (err) {
      console.error("[sso/logout] failed to build logout URL:", err.message);
      return res.json({ logoutUrl: null });
    }
    return res.json({ logoutUrl: url });
  });
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
