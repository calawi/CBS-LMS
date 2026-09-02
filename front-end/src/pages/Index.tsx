import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Award, ArrowUpRight, PlayCircle, CheckCircle2, FileQuestion, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useEnrollments, useCertifications } from "@/hooks/useData";
import { useMyPoints } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/integrations/api/client";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const useMyAssessmentResults = () => {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["my_assessment_results", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/assessment-results/me", { token });
      return res?.data ?? res;
    },
    enabled: !!user && !!token,
  });
};

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: enrollments, isLoading: loadingEnrollments } = useEnrollments();
  const { data: assessmentResults } = useMyAssessmentResults();
  const { data: certifications, isLoading: loadingCerts } = useCertifications();
  const { data: myPoints, isLoading: loadingPoints } = useMyPoints();

  const isLoading =
    loadingEnrollments || loadingCerts || loadingPoints;

  const myEnrollments = enrollments || [];
  const inProgress = myEnrollments.filter(e => e.status !== "completed");
  const completedCount = myEnrollments.filter(e => e.status === "completed").length;
  const certificateCount = (certifications || []).length;
  const totalPoints = (myPoints || []).reduce((sum: number, p: any) => sum + Number(p.points || 0), 0);
  const avgProgress = myEnrollments.length > 0
    ? Math.round(myEnrollments.reduce((s, e) => s + Number(e.progress), 0) / myEnrollments.length)
    : 0;
  const totalHoursLearned = useMemo(() => {
    return myEnrollments.reduce((total, e) => {
      const course = (e as any).courses;
      if (!course) return total;
      return total + (Number(course.duration_hours) * Number(e.progress) / 100);
    }, 0);
  }, [myEnrollments]);

  const getEnrollmentStatus = (enrollment: any) => {
    const progress = Number(enrollment?.progress || 0);
    if (enrollment?.status === "completed") return "Completed";
    if (progress > 0) return "In Progress";
    return "Not Started";
  };

  const courseProgressData = myEnrollments.map((enrollment: any) => ({
    title: enrollment.courses?.title || "Course",
    progress: Number(enrollment.progress || 0),
  }));

  const courseStatusData = [
    { name: "Completed", value: myEnrollments.filter((e: any) => getEnrollmentStatus(e) === "Completed").length, color: "#10b981" },
    { name: "In Progress", value: myEnrollments.filter((e: any) => getEnrollmentStatus(e) === "In Progress").length, color: "#f59e0b" },
    { name: "Not Started", value: myEnrollments.filter((e: any) => getEnrollmentStatus(e) === "Not Started").length, color: "#94a3b8" },
  ].filter((item) => item.value > 0);

  // Build recent activity timeline
  const recentActivity = useMemo(() => {
    const items: { id: string; icon: any; text: string; detail: string; time: Date; color: string }[] = [];

    myEnrollments.forEach(e => {
      const title = (e as any).courses?.title || "Course";
      items.push({
        id: `enroll-${e.id}`,
        icon: PlayCircle,
        text: `Enrolled in ${title}`,
        detail: `${e.progress}% complete`,
        time: new Date(e.enrolled_at),
        color: "text-primary",
      });
      if (e.completed_at) {
        items.push({
          id: `complete-${e.id}`,
          icon: CheckCircle2,
          text: `Completed ${title}`,
          detail: "Course finished",
          time: new Date(e.completed_at),
          color: "text-success",
        });
      }
    });

    (assessmentResults || []).forEach(r => {
      const assessmentData = r as any;
      const courseTitle = assessmentData.assessments?.courses?.title || "Assessment";
      items.push({
        id: `assess-${r.id}`,
        icon: FileQuestion,
        text: `${r.passed ? "Passed" : "Attempted"} ${courseTitle} quiz`,
        detail: `Score: ${r.score}%`,
        time: new Date(r.completed_at),
        color: r.passed ? "text-success" : "text-warning",
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
  }, [myEnrollments, assessmentResults, user]);

  const stats = [
    { label: "Enrolled", value: String(myEnrollments.length), icon: BookOpen, change: `${avgProgress}% avg progress`, color: "bg-cyan-500" },
    { label: "In Progress", value: String(inProgress.length), icon: PlayCircle, change: `${totalHoursLearned.toFixed(1)}h learned`, color: "bg-amber-400" },
    { label: "Completed", value: String(completedCount), icon: CheckCircle2, change: "Courses finished", color: "bg-emerald-500" },
    { label: "Certificates", value: String(certificateCount), icon: Award, change: "Earned certificates", color: "bg-sky-500" },
    { label: "Points", value: String(totalPoints), icon: Trophy, change: "Learning score", color: "bg-rose-500" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.user_metadata?.full_name || user?.email}. Here's your learning overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className={`${stat.color} border-0 text-white shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/95">{stat.label}</p>
                    <p className="text-3xl font-display font-bold mt-4">{stat.value}</p>
                    <p className="text-xs text-white/80 mt-2">{stat.change}</p>
                  </div>
                  <div className="rounded-xl border border-white/25 bg-white/10 p-2.5">
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboarding */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Course Progress</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Progress for every enrolled course</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {courseProgressData.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseProgressData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="progress" name="Progress %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No courses enrolled yet.
                </div>
              )}
              {/* <div className="hidden">
              {[{ label: "Required", list: onboardingRequired }, { label: "Optional", list: onboardingOptional }].map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{group.label}</p>
                    <Badge variant="secondary" className="text-xs">{group.list.length}</Badge>
                  </div>
                  {group.list.length ? (
                    <div className="space-y-2">
                      {group.list.slice(0, 4).map((enrollment: any) => {
                        const course = enrollment.courses;
                        const status = getEnrollmentStatus(enrollment);
                        const badge = getStatusBadge(status);
                        const progress = Number(enrollment.progress || 0);
                        const remainingHours = course?.duration_hours
                          ? Math.max(0, (Number(course.duration_hours) * (100 - progress)) / 100)
                          : null;
                        return (
                          <Link
                            key={enrollment.id}
                            to={`/courses/${enrollment.course_id}`}
                            className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{course?.title || "Course"}</p>
                                <p className="text-xs text-muted-foreground mt-1">{course?.modules_count} modules</p>
                              </div>
                              <div className="text-right">
                                <Badge className={badge.className} variant="outline">{badge.text}</Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {remainingHours != null && status !== "Completed" ? `${remainingHours.toFixed(1)}h left` : "—"}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items.</p>
                  )}
                </div>
              ))}
              </div> */}
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Course Status</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">Completed, in progress, and not started courses</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {courseStatusData.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={courseStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {courseStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No courses enrolled yet.
                </div>
              )}
              {/* <div className="hidden">
              {complianceEnrollments.length ? (
                complianceEnrollments.slice(0, 5).map((enrollment: any) => {
                  const course = enrollment.courses;
                  const status = getEnrollmentStatus(enrollment);
                  const cert = getCertForCourse(enrollment.course_id);
                  const hasCert = !!cert;
                  const risk = getComplianceRisk(enrollment, cert);
                  const expiryLine = formatExpiryLine(cert);
                  return (
                    <Link
                      key={enrollment.id}
                      to={`/courses/${enrollment.course_id}`}
                      className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{course?.title || "Course"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {status}
                            {" • "}
                            {hasCert ? "Certified" : "Certificate pending"}
                            {expiryLine ? ` • ${expiryLine}` : hasCert && status === "Completed" ? " • No expiry date" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={risk.className} variant="outline">{risk.label}</Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No compliance courses enrolled.</p>
              )}
              </div> */}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Enrollments */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">My Active Courses</CardTitle>
                <Link to="/courses" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Browse catalog <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inProgress.length > 0 ? inProgress.slice(0, 5).map((enrollment) => {
                const course = (enrollment as any).courses;
                const progress = Number(enrollment.progress);
                return (
                  <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`} className="block group">
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {course?.title || "Course"}
                          </p>
                          <span className="text-xs font-semibold text-primary ml-2 shrink-0">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground">{course?.category}</span>
                          <span className="text-xs text-muted-foreground">• {course?.duration_hours}h</span>
                          <span className="text-xs text-muted-foreground">• {course?.modules_count} modules</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No active courses</p>
                  <Link to="/courses" className="text-xs text-primary hover:underline">Browse and enroll in courses</Link>
                </div>
              )}

              {/* Show completed courses summary */}
              {completedCount > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    {completedCount} course{completedCount !== 1 ? "s" : ""} completed
                  </span>
                  <Link to="/my-learning" className="text-xs text-primary hover:underline ml-auto">View all →</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.text}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.detail}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(item.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Enroll in a course to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default Dashboard;
