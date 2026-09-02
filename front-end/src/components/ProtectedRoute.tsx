import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <img src="/logo.png" alt="CBS Staff LMS" className="w-full max-w-xs object-contain animate-pulse" />
        <p className="font-display text-sm font-semibold text-muted-foreground">CBS Staff LMS</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
