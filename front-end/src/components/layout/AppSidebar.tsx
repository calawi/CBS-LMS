import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, GraduationCap,
  BarChart3, Users, LogOut, ChevronLeft, Menu, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppRole, getPrimaryRole, hasAnyRole } from "@/lib/roles";
import { TRAINING_PROGRAMS } from "@/lib/courseCategories";

const navItems: { icon: LucideIcon; labelKey: string; path: string; allow: AppRole[] }[] = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/", allow: ["sysadmin", "instructor", "manager", "learner"] },
  { icon: BookOpen, labelKey: "nav.courses", path: "/courses", allow: ["sysadmin", "instructor", "manager"] },
  { icon: GraduationCap, labelKey: "nav.myLearning", path: "/my-learning", allow: ["sysadmin", "instructor", "manager", "learner"] },
  { icon: Trophy, labelKey: "nav.leaderboard", path: "/leaderboard", allow: ["sysadmin", "instructor", "manager", "learner"] },
  { icon: BarChart3, labelKey: "nav.reports", path: "/reports", allow: ["sysadmin", "instructor", "manager"] },
  { icon: Users, labelKey: "nav.admin", path: "/admin", allow: ["sysadmin", "manager"] },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "U";
  const roleLabel = getPrimaryRole(user?.roles).toUpperCase();

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-primary p-2 text-primary-foreground shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 bg-sidebar text-sidebar-foreground",
          collapsed ? "-translate-x-full lg:w-64" : "w-64",
          "lg:relative lg:translate-x-0"
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-6">
          <div className="flex items-center gap-3">
            <img
              src="/cbs-logo-icon.png"
              alt="Central Bank of Somalia"
              className="h-10 w-10 shrink-0 rounded-sm object-contain"
            />
            <div className="min-w-0">
              <h1 className="font-display text-base font-extrabold leading-tight text-sidebar-foreground">
                CBS Staff LMS
              </h1>
              <p className="text-xs font-semibold text-sidebar-foreground/75">Learning Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-7 space-y-2">
          {navItems.filter((item) => hasAnyRole(user?.roles, item.allow)).map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && "hidden lg:inline")}>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}

          {hasAnyRole(user?.roles, ["learner", "instructor", "manager", "sysadmin"]) && (
            <div className="pt-6 mt-3 border-t border-sidebar-border space-y-2">
              <p
                className={cn(
                  "px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-muted",
                  collapsed && "hidden lg:block",
                )}
              >
                {t("nav.trainingPrograms")}
              </p>
              {TRAINING_PROGRAMS.map((program) => {
                const path = `/learning/${program.slug}`;
                const isActive =
                  location.pathname === path || location.pathname.startsWith(`${path}/`);
                return (
                  <NavLink
                    key={program.slug}
                    to={path}
                    onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <program.icon className="h-4 w-4 shrink-0" />
                    <span className={cn("font-bold leading-tight", collapsed && "hidden lg:inline")}>
                      <span className="hidden text-[10px] text-sidebar-muted mr-1">{program.letter}.</span>
                      {t(program.labelKey)}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold">
              {initials}
            </div>
            <div className={cn("flex-1 min-w-0", collapsed && "hidden lg:block")}>
                <p className="text-sm font-semibold truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-300">{roleLabel}</p>
            </div>
            <div className={cn(collapsed && "hidden lg:block")}>
              <button
                onClick={signOut}
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                title={t("common.signOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
};

export default AppSidebar;
