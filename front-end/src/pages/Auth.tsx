import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/integrations/api/client";

// AD / SSO is the only way into LMS - no local password fallback. Every login goes through
// miniOrange (AD credentials + OTP), full stop.
const Auth = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const goToSso = () => {
    window.location.href = `${API_URL}/api/auth/sso/login`;
  };

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const message =
        error === "sso_failed" || error === "sso_not_configured"
          ? "SSO sign-in failed. Please try again, or contact your administrator if this continues."
          : error;
      toast({ title: "Sign-in failed", description: message, variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("error");
      setSearchParams(next, { replace: true });
      // A failed attempt still needs a fresh AuthnRequest to retry - don't auto-redirect again
      // immediately, let the user click Sign In once they've read the error.
      return;
    }

    // Auto-redirect straight to miniOrange on load, same as suptech.centralbank.gov.so does -
    // no click needed for a normal, first-time visit.
    goToSso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
