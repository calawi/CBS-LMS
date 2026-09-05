import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/integrations/api/client";

// Pure SSO entry point - always redirects straight to miniOrange, matches miniOrange's own
// login screen while it does. No local-password fallback lives here on purpose: accounts
// without an AD/miniOrange identity (e.g. CBS.admin) sign in at the separate /local-login page
// instead.
const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [rejection, setRejection] = useState<string | null>(null);

  const goToSso = () => {
    window.location.href = `${API_URL}/api/auth/sso/login`;
  };

  // Used only from a manual click after a failed/rejected SSO login. Hits a separate forceAuthn
  // entry point so miniOrange re-prompts for credentials instead of silently reusing the
  // still-active broker session for the same (rejected) account. This is deliberately NOT
  // fired automatically: an earlier version retried on a timer with no click required, and in
  // production that produced a fast, unattended bounce between the LMS and miniOrange - we
  // can't fully verify miniOrange re-prompts on every single ForceAuthn request, so a real
  // human click is what keeps this from looping.
  const goToSsoRetry = () => {
    window.location.href = `${API_URL}/api/auth/sso/login-retry`;
  };

  useEffect(() => {
    const error = searchParams.get("error");

    if (!error) {
      // Normal, first-time visit - straight to miniOrange, no click needed.
      goToSso();
      return;
    }

    const isTechnicalFailure = error === "sso_failed" || error === "sso_not_configured";
    const message = isTechnicalFailure ? "SSO sign-in failed. Please try again." : error;
    toast({ title: "SSO sign-in failed", description: message, variant: "destructive" });
    setRejection(message);

    const next = new URLSearchParams(searchParams);
    next.delete("error");
    setSearchParams(next, { replace: true });
    // Runs once on mount only - safe to call setSearchParams here since this effect has no
    // dependency on searchParams and nothing else in it re-fires on a URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rejection) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-[#eef0f6] px-4 pt-16 sm:pt-20">
        <img src="/logo.png" alt="Central Bank of Somalia" className="mb-8 w-full max-w-[280px] object-contain" />

        <div className="w-full max-w-[480px]">
          <Card className="rounded-xl border-0 bg-white shadow-md">
            <CardHeader className="pb-0">
              <h1 className="text-center text-2xl font-normal text-[#333]">Sign-in failed</h1>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <div className="mb-6 h-px bg-[#e6e6e6]" />
              <p className="mb-6 text-sm text-[#555]">{rejection}</p>
              <Button
                type="button"
                onClick={goToSsoRetry}
                className="h-11 rounded-md bg-[#1d5fd1] px-10 text-white hover:bg-[#1750b8]"
              >
                Try signing in again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#eef0f6] px-4 pt-16 sm:pt-20">
      <img src="/logo.png" alt="Central Bank of Somalia" className="mb-8 w-full max-w-[280px] object-contain" />

      <div className="w-full max-w-[480px]">
        <Card className="rounded-xl border-0 bg-white shadow-md">
          <CardHeader className="pb-0">
            <h1 className="text-center text-2xl font-normal text-[#333]">Sign In with your credentials</h1>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 h-px bg-[#e6e6e6]" />

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                goToSso();
              }}
            >
              <Input
                id="ad-username"
                autoComplete="username"
                placeholder="AD Username"
                aria-label="AD Username"
                className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 text-[#222]"
              />
              <Input
                id="ad-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 text-[#222]"
              />
              <div className="pt-2 text-center">
                <Button type="submit" className="h-11 rounded-md bg-[#1d5fd1] px-10 text-white hover:bg-[#1750b8]">
                  Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
