import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Dedicated sign-in page for accounts that don't have an AD/miniOrange identity (e.g. CBS.admin) -
// separate from /auth on purpose, so the SSO page stays a clean, single-purpose auto-redirect with
// no fallback UI on it. Non-AD accounts are configured directly (same idea as the ERP's own
// separate login path for non-AD users) and are given this URL instead of /auth.
const LocalLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, completeMfaLogin, register } = useAuth();

  const resetMfa = () => {
    setNeedsMfa(false);
    setMfaToken(null);
    setMfaCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (needsMfa && mfaToken) {
        await completeMfaLogin({ mfa_token: mfaToken, mfa_code: mfaCode.replace(/\s/g, "") });
        resetMfa();
        navigate("/");
        return;
      }

      if (isLogin) {
        const result = await login({ email, password });
        if (result && "mfa_required" in result) {
          setMfaToken(result.mfa_token);
          setNeedsMfa(true);
          setMfaCode("");
          toast({
            title: "Authenticator required",
            description: "Enter the 6-digit code from your app.",
          });
          return;
        }
        navigate("/");
      } else {
        await register({ email, password, full_name: fullName, role: "learner" });
        toast({
          title: "Account created",
          description: "Account created. Please sign in.",
        });
        setIsLogin(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const heading = needsMfa ? "Verify your identity" : isLogin ? "Sign In with your credentials" : "Create your account";

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#eef0f6] px-4 pt-16 sm:pt-20">
      <img src="/logo.png" alt="Central Bank of Somalia" className="mb-8 w-full max-w-[280px] object-contain" />

      <div className="w-full max-w-[480px]">
        <Card className="rounded-xl border-0 bg-white shadow-md">
          <CardHeader className="pb-0">
            <h1 className="text-center text-2xl font-normal text-[#333]">{heading}</h1>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 h-px bg-[#e6e6e6]" />

            <form onSubmit={handleSubmit} className="space-y-4">
              {needsMfa ? (
                <>
                  <p className="text-center text-sm text-[#555]">
                    Please enter the 6 digit code generated on your authenticator app.
                  </p>
                  <Input
                    id="mfa"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter OTP here"
                    aria-label="Authenticator code"
                    required
                    className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 text-center text-lg tracking-widest text-[#222]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-[12px] text-[#7f8a99]"
                    onClick={() => resetMfa()}
                  >
                    Back to password
                  </Button>
                </>
              ) : (
                <>
                  {!isLogin && (
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      aria-label="Full name"
                      required={!isLogin}
                      className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 text-[#222]"
                    />
                  )}
                  <Input
                    id="email"
                    type={isLogin ? "text" : "email"}
                    autoComplete={isLogin ? "username" : "email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isLogin ? "Username" : "Email"}
                    aria-label={isLogin ? "Username" : "Email"}
                    required
                    className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 text-[#222]"
                  />
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      aria-label="Password"
                      required
                      minLength={6}
                      className="h-12 rounded-md border-0 bg-[#e8eef8] px-4 pr-11 text-[#222]"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#666] hover:bg-[#d6ddea]/50 hover:text-[#222]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </>
              )}
              <div className="pt-2 text-center">
                <Button
                  type="submit"
                  className="h-11 rounded-md bg-[#1d5fd1] px-10 text-white hover:bg-[#1750b8]"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : needsMfa ? "Verify" : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LocalLogin;
