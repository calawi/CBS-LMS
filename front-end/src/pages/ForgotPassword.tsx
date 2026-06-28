import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDebugLink(null);
    try {
      const out = await requestPasswordReset(email.trim());
      setSent(true);
      toast({
        title: "Check your email",
        description: out.message || "If an account exists, instructions were sent.",
      });
      if (out.debug_reset_link) setDebugLink(out.debug_reset_link);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Request failed",
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
            <CardTitle className="text-center font-display text-[#4d91d9]">Reset password</CardTitle>
            <CardDescription className="text-center">
              Enter your account email. We will send reset instructions if the account exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@cbs.gov.so"
                    required
                    className="h-9"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                If an account exists for that address, you will receive an email with a link to choose a new password.
              </p>
            )}
            {debugLink && (
              <p className="mt-3 text-xs break-all rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
                Dev only:{" "}
                <a href={debugLink} className="text-primary underline">
                  {debugLink}
                </a>
              </p>
            )}
            <div className="mt-4 text-center text-sm">
              <Link to="/auth" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
