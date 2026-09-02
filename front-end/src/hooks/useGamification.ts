import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/integrations/api/client";

export const useMyPoints = () => {
  const { user, token } = useAuth();
  return useQuery({
    queryKey: ["my_points", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/gamification/my-points", { token });
      return res?.data ?? res;
    },
    enabled: !!user && !!token,
  });
};

export const useMyBadges = () => {
  const { user, token } = useAuth();
  return useQuery({
    queryKey: ["my_badges", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/gamification/my-badges", { token });
      return res?.data ?? res;
    },
    enabled: !!user && !!token,
  });
};

export const useAllBadges = () => {
  return useQuery({
    queryKey: ["all_badges"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/gamification/all-badges");
      return res?.data ?? res;
    },
  });
};

export const useLeaderboard = () => {
  const { user, token } = useAuth();
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/gamification/leaderboard", { token });
      return res?.data ?? res ?? [];
    },
    enabled: !!user && !!token,
    retry: 1,
    staleTime: 30_000,
  });
};
