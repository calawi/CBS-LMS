import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#efefef] px-4">
      <div className="w-full max-w-[360px]">
        <Card className="border border-[#d9d9d9] bg-white shadow-sm">
          <CardHeader>
            <div className="text-center">
              <img
                src="/logo.png"
                alt="Central Bank of Somalia"
                className="mx-auto w-full max-w-[320px] object-contain"
              />
              <CardTitle className="mt-4 font-display text-[26px] tracking-wide text-[#4d91d9]">
                CBS STAFF LMS
              </CardTitle>
            </div>
            <CardDescription className="pt-1 text-center text-[22px] tracking-widest text-[#333]">
              {needsMfa ? "VERIFY CODE" : isLogin ? "LOGIN" : "REGISTER"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {needsMfa ? (
                <>
                  <p className="text-xs text-[#555] text-center">
                    Open your authenticator app and enter the code for CBS Staff LMS.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="mfa" className="text-[12px] text-[#555]">
                      Authenticator code
                    </Label>
                    <Input
                      id="mfa"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="000000"
                      required
                      className="h-8 rounded-[2px] border-[#d6ddea] bg-[#e8eef8] text-[#222] tracking-widest text-center text-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-[11px] text-[#7f8a99]"
                    onClick={() => resetMfa()}
                  >
                    Back to password
                  </Button>
                </>
              ) : (
                <>
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-[12px] text-[#555]">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ahmed Hassan"
                        required={!isLogin}
                        className="h-8 rounded-[2px] border-[#d6ddea] bg-[#e8eef8] text-[#222]"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[12px] text-[#555]">
                      {isLogin ? "Email or Employee ID" : "Email"}
                    </Label>
                    <Input
                      id="email"
                      type={isLogin ? "text" : "email"}
                      autoComplete={isLogin ? "username" : "email"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isLogin ? "you@cbs.gov.so or CBS-001" : "you@cbs.gov.so"}
                      required
                      className="h-8 rounded-[2px] border-[#d6ddea] bg-[#e8eef8] text-[#222]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[12px] text-[#555]">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="h-8 rounded-[2px] border-[#d6ddea] bg-[#e8eef8] pr-9 text-[#222]"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-[#666] hover:bg-[#d6ddea]/50 hover:text-[#222]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              <Button
                type="submit"
                className="mt-1 h-9 w-full rounded-[2px] bg-[#4d91d9] text-white hover:bg-[#3f83cc]"
                disabled={loading}
              >
                {loading ? "Please wait..." : needsMfa ? "Verify & sign in" : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            {!needsMfa && (
              <div className="mt-4 space-y-2 text-center">
                {isLogin && (
                  <div>
                    <Link to="/auth/forgot" className="text-[11px] text-[#7f8a99] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 border-t border-[#e6e6e6] pt-3 text-center text-[10px] text-[#8a8a8a]">
              All rights reserved © Central Bank of Somalia
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
