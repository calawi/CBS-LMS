import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/integrations/api/client";

export const useCourses = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/courses", { token });
      return res?.data ?? res;
    },
  });
};

export const useCourseById = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/courses/${courseId}`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId && !!token,
  });
};

export const useCourseModules = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["course_modules", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/course-modules/${courseId}`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId && !!token,
  });
};

export const useEnrollments = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/enrollments/me", { token });
      return res?.data ?? res;
    },
  });
};

export const useEnrollmentForCourse = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["enrollment", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/enrollments/me/${courseId}`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId && !!token,
  });
};

export const useEnrollInCourse = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const res = await apiFetch<any>("/api/lms/enrollments", {
        method: "POST",
        token,
        body: { course_id: courseId },
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
    },
  });
};

export const useUpdateProgress = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, progress, status }: { enrollmentId: string; progress: number; status?: string }) => {
      const update: Record<string, unknown> = { progress };
      if (status) update.status = status;
      const res = await apiFetch<any>(`/api/lms/enrollments/${enrollmentId}/progress`, {
        method: "PUT",
        token,
        body: update,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
    },
  });
};

export const useCertifications = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/certifications/me", { token });
      return res?.data ?? res;
    },
  });
};

export const useAssessmentForCourse = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["assessment", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/assessments/course/${courseId}`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId,
  });
};

export const useAssessmentQuestions = (assessmentId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["assessment_questions", assessmentId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/assessment-questions/${assessmentId}`, { token });
      return res?.data ?? res;
    },
    enabled: !!assessmentId && !!token,
  });
};

export const useAssessmentResults = (assessmentId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["assessment_results", assessmentId],
    queryFn: async () => {
      const res = await apiFetch<any>(
        `/api/lms/assessment-results/me?assessmentId=${encodeURIComponent(String(assessmentId))}`,
        { token },
      );
      return res?.data ?? res;
    },
    enabled: !!assessmentId && !!token,
  });
};

export const useAllAssessmentResults = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["all_assessment_results"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/assessment-results/me", { token });
      return res?.data ?? res;
    },
    enabled: !!token,
  });
};

export const useProfiles = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/profiles", { token });
      return res?.data ?? res;
    },
  });
};

export const useDepartments = () => {
  // Departments are global, but still allow token if backend requires it.
  const { token } = useAuth();
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/departments", { token });
      return res?.data ?? res;
    },
  });
};

export const useUserRoles = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/user-roles", { token });
      return res?.data ?? res;
    },
  });
};

export const useAssignRole = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiFetch<any>("/api/lms/user-roles", {
        method: "POST",
        token,
        body: { userId, role },
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    },
  });
};

export const useRemoveRole = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      await apiFetch<any>(`/api/lms/user-roles/${roleId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    },
  });
};

export const useCreateUser = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: {
      email: string;
      password: string;
      full_name: string;
      role: string;
      employee_id?: string;
      job_title?: string;
      department_id?: string;
      location?: string;
      phone?: string;
      date_of_joining?: string;
    }) => {
      const res = await apiFetch<any>("/api/lms/users", {
        method: "POST",
        token,
        body: user,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    },
  });
};

export const useCreateCourse = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (course: {
      title: string;
      description: string;
      category: string;
      level: string;
      duration_hours: number;
      modules_count: number;
      is_mandatory: boolean;
      is_prerequisite_for_overseas: boolean;
    }) => {
      const res = await apiFetch<any>("/api/lms/courses", {
        method: "POST",
        token,
        body: { ...course, status: "Published" },
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
};

export const useAuthAccount = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["auth_me", user?.id],
    queryFn: async () => {
      const res = await apiFetch<{ data: { email: string; mfa_enabled: number } }>("/api/auth/me", { token });
      return res?.data ?? res;
    },
    enabled: !!token && !!user,
  });
};

export const useActiveAnnouncements = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["announcements_active", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/announcements/active", { token });
      return (res?.data ?? res) as any[];
    },
    enabled: !!token && !!user,
  });
};

export const useMyTrainingAssignments = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["training_assignments_me", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/training-assignments/me", { token });
      return (res?.data ?? res) as any[];
    },
    enabled: !!token && !!user,
  });
};

export const useTeamProfiles = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["profiles_my_team", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/profiles/my-team", { token });
      return (res?.data ?? res) as any[];
    },
    enabled: !!token && !!user,
  });
};

export const useTeamEnrollments = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["enrollments_team", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/enrollments/team", { token });
      return (res?.data ?? res) as any[];
    },
    enabled: !!token && !!user,
  });
};

export const useAssignTraining = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { user_id: number; course_id: number; due_at?: string | null; is_required?: boolean }) => {
      const res = await apiFetch<any>("/api/lms/training-assignments", {
        method: "POST",
        token,
        body,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_assignments_me"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments_team"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
};

export const useCourseRatingSummary = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["course_rating_summary", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/courses/${courseId}/ratings/summary`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId && !!token,
  });
};

export const useMyCourseRating = (courseId: string | undefined) => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["course_rating_me", courseId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/courses/${courseId}/ratings/me`, { token });
      return res?.data ?? res;
    },
    enabled: !!courseId && !!token,
  });
};

export const useSubmitCourseRating = (courseId: string | undefined) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment?: string }) => {
      const res = await apiFetch<any>(`/api/lms/courses/${courseId}/ratings`, {
        method: "POST",
        token,
        body: { rating, comment: comment || null },
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_rating_summary", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course_rating_me", courseId] });
    },
  });
};

export const useAuditLogs = (offset: number, limit: number) => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["audit_logs", offset, limit, user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/lms/audit-logs?offset=${offset}&limit=${limit}`, { token });
      return res as { data: any[]; total: number };
    },
    enabled: !!token && !!user,
  });
};

export const useCreateAnnouncement = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      body: string;
      audience?: string;
      starts_at?: string | null;
      ends_at?: string | null;
      is_active?: boolean;
    }) => {
      const res = await apiFetch<any>("/api/lms/announcements", {
        method: "POST",
        token,
        body,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements_active"] });
    },
  });
};
