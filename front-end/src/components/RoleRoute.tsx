import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, hasAnyRole } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  allow: AppRole[];
};

const RoleRoute = ({ children, allow }: Props) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAnyRole(user.roles, allow)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default RoleRoute;

