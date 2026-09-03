import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const SsoCallback = () => {
  const navigate = useNavigate();
  const { loginWithSso } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token");
    const encodedUser = params.get("user");

    if (!token || !encodedUser) {
      navigate("/auth?error=sso_failed", { replace: true });
      return;
    }

    try {
      const base64 = encodedUser.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const user = JSON.parse(atob(padded));
      const ok = loginWithSso(token, user);
      if (!ok) {
        navigate("/auth?error=sso_failed", { replace: true });
        return;
      }
      navigate("/", { replace: true });
    } catch {
      navigate("/auth?error=sso_failed", { replace: true });
    }
    // Runs once on mount to consume the SAML redirect fragment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#efefef] px-4">
      <Card className="w-full max-w-[360px] border border-[#d9d9d9] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-center font-display text-[#4d91d9]">Signing in</CardTitle>
          <CardDescription className="text-center">Completing your SSO login...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">Please wait.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SsoCallback;
