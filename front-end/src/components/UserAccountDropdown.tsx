import { Link, useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryRole, hasAnyRole } from "@/lib/roles";

const toInitials = (name?: string, email?: string) => {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() || "U";
};

const toRoleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

const UserAccountDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const name = user?.user_metadata?.full_name || user?.full_name || "User";
  const email = user?.email || "";
  const initials = toInitials(name, email);
  const roleLabel = toRoleLabel(getPrimaryRole(user?.roles));
  const canAccessSettings = hasAnyRole(user?.roles, ["sysadmin", "instructor", "manager", "learner"]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {roleLabel}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/auth/forgot">
            <KeyRound className="mr-2 h-4 w-4" />
            Change password
          </Link>
        </DropdownMenuItem>
        {canAccessSettings && (
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAccountDropdown;
