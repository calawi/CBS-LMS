import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { normalizeRoles } from "@/lib/roles";

type AppUser = {
  id: number;
  email?: string;
  full_name?: string;
  roles: string[];
  user_metadata?: {
    full_name?: string;
  };
};

export type MfaChallenge = { mfa_required: true; mfa_token: string };

type LoginInput = { email: string; password: string; mfa_code?: string };
type RegisterInput = { email: string; password: string; full_name: string; role?: string };

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  token: string | null;
  login: (payload: LoginInput) => Promise<void | MfaChallenge>;
  completeMfaLogin: (payload: { mfa_token: string; mfa_code: string }) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message?: string; debug_reset_link?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
  loginWithSso: (token: string, rawUser: unknown) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  login: async () => {},
  completeMfaLogin: async () => {},
  register: async () => {},
  requestPasswordReset: async () => ({}),
  resetPassword: async () => {},
  loginWithSso: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

const toSafeUser = (raw: unknown): AppUser | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<AppUser>;
  if (typeof candidate.id !== "number") return null;

  const roles = Array.isArray(candidate.roles)
    ? normalizeRoles(candidate.roles.filter((r): r is string => typeof r === "string"))
    : [];

  return {
    id: candidate.id,
    email: typeof candidate.email === "string" ? candidate.email : undefined,
    full_name: typeof candidate.full_name === "string" ? candidate.full_name : undefined,
    roles,
    user_metadata: {
      full_name: typeof candidate.full_name === "string" ? candidate.full_name : undefined,
    },
  };
};

const normalizeError = async (res: Response, fallback: string) => {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    let parsedUser: AppUser | null = null;
    if (savedUser) {
      try {
        parsedUser = toSafeUser(JSON.parse(savedUser));
      } catch {
        parsedUser = null;
      }
    }

    setToken(savedToken || null);
    setUser(parsedUser);
    setLoading(false);
  }, []);

  const persistSession = (nextToken: string, nextUser: AppUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const login = async ({ email, password, mfa_code }: LoginInput) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(mfa_code ? { mfa_code } : {}),
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(typeof body?.error === "string" ? body.error : "Login failed");
    }

    if (body?.mfa_required && body?.mfa_token) {
      return { mfa_required: true as const, mfa_token: body.mfa_token };
    }

    if (!body?.token || !body?.user) {
      throw new Error("Invalid login response");
    }

    const nextUser = toSafeUser(body.user);
    if (!nextUser) throw new Error("Invalid user profile in response");

    persistSession(body.token, nextUser);
  };

  const completeMfaLogin = async ({ mfa_token, mfa_code }: { mfa_token: string; mfa_code: string }) => {
    const res = await fetch(`${API_URL}/api/auth/login/mfa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfa_token, mfa_code }),
    });

    if (!res.ok) throw new Error(await normalizeError(res, "MFA verification failed"));

    const body = await res.json();
    if (!body?.token || !body?.user) throw new Error("Invalid MFA response");

    const nextUser = toSafeUser(body.user);
    if (!nextUser) throw new Error("Invalid user profile in response");

    persistSession(body.token, nextUser);
  };

  const register = async ({ email, password, full_name, role }: RegisterInput) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, role: role || "learner" }),
    });

    if (!res.ok) throw new Error(await normalizeError(res, "Registration failed"));
  };

  const requestPasswordReset = async (email: string) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body?.error === "string" ? body.error : "Request failed");
    }
    return {
      message: typeof body?.message === "string" ? body.message : undefined,
      debug_reset_link: typeof body?.debug_reset_link === "string" ? body.debug_reset_link : undefined,
    };
  };

  const resetPassword = async (resetToken: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password }),
    });
    if (!res.ok) throw new Error(await normalizeError(res, "Reset failed"));
  };

  /** Called by SsoCallback.tsx after miniOrange -> LMS SAML round trip succeeds. */
  const loginWithSso = (nextToken: string, rawUser: unknown): boolean => {
    const nextUser = toSafeUser(rawUser);
    if (!nextToken || !nextUser) return false;
    persistSession(nextToken, nextUser);
    return true;
  };

  const signOut = async () => {
    // If this was an SSO login, ask the backend for a Single Logout redirect URL *before*
    // clearing the local token (the request needs to be authenticated). Otherwise sign-out only
    // ends the LMS's own session - the miniOrange/AD session stays alive, and the auto-redirect
    // on /auth would silently log the user back in without prompting for credentials again.
    let logoutUrl: string | null = null;
    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/auth/sso/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          logoutUrl = typeof body?.logoutUrl === "string" ? body.logoutUrl : null;
        }
      } catch {
        // Backend unreachable - fall back to a local-only sign-out below.
      }
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Always a full page redirect (not react-router navigate) so this works regardless of where
    // signOut() is called from. SSO sessions go through miniOrange's own logout page; local
    // sessions go back to /local-login, NOT /auth - /auth is SSO-only and would otherwise
    // silently reuse any still-active miniOrange broker session in this browser (from an
    // unrelated earlier SSO login) and immediately reject it, since that's a different account
    // than the local one that just logged out.
    window.location.href = logoutUrl || "/local-login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        completeMfaLogin,
        register,
        requestPasswordReset,
        resetPassword,
        loginWithSso,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
