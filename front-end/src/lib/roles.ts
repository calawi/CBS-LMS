export type AppRole = "sysadmin" | "instructor" | "manager" | "learner";

const normalizeRole = (role: string): string => {
  const cleaned = String(role || "").trim().toLowerCase();
  if (cleaned === "admin" || cleaned === "sys_admin" || cleaned === "systemadmin") return "sysadmin";
  if (cleaned === "employee" || cleaned === "student" || cleaned === "normal_user") return "learner";
  if (cleaned === "hr" || cleaned === "supervisor" || cleaned === "teacher") return "instructor";
  if (cleaned === "manager") return "manager";
  return cleaned;
};

export const normalizeRoles = (roles: string[] | undefined | null): AppRole[] => {
  const set = new Set((roles || []).map(normalizeRole));
  const normalized = Array.from(set).filter(
    (r): r is AppRole => r === "sysadmin" || r === "instructor" || r === "manager" || r === "learner"
  );
  // Safety fallback: never hide all menu entries due to missing/invalid roles.
  return normalized.length ? normalized : ["learner"];
};

export const hasAnyRole = (roles: string[] | undefined | null, allowed: AppRole[]): boolean => {
  const normalized = normalizeRoles(roles);
  return normalized.some((r) => allowed.includes(r));
};

export const getPrimaryRole = (roles: string[] | undefined | null): AppRole => {
  const normalized = normalizeRoles(roles);
  if (normalized.includes("sysadmin")) return "sysadmin";
  if (normalized.includes("manager")) return "manager";
  if (normalized.includes("instructor")) return "instructor";
  return "learner";
};

