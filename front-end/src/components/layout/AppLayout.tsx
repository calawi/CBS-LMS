import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import UserAccountDropdown from "@/components/UserAccountDropdown";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const { user } = useAuth();

  useEffect(() => {
    const savedTheme = user?.id ? localStorage.getItem(`theme:${user.id}`) : "light";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, [user?.id]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-3 shrink-0">
            <div className="flex items-center gap-3 flex-1 max-w-md pl-12 lg:pl-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses, employees..." className="pl-9 bg-muted/50 border-0 focus-visible:ring-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationsDropdown />
              <UserAccountDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AppLayout;
