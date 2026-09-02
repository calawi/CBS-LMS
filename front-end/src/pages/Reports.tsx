import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Award, BookOpen, Download, Target, TrendingUp, Users } from "lucide-react";
import { useCourses, useProfiles, useDepartments } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/integrations/api/client";

const COLORS = [
  "hsl(215, 80%, 28%)",
  "hsl(170, 60%, 40%)",
  "hsl(45, 90%, 55%)",
  "hsl(200, 80%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 50%)",
];

const escapeExcel = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tableToHtml = (title: string, columns: string[], rows: Array<Record<string, unknown>>) => `
  <h2>${escapeExcel(title)}</h2>
  <table border="1">
    <thead>
      <tr>${columns.map((column) => `<th>${escapeExcel(column)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.length > 0
        ? rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeExcel(row[column])}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${columns.length}">No data</td></tr>`}
    </tbody>
  </table>
`;

const useAllEnrollments = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["all_enrollments"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/enrollments", { token });
      return res?.data ?? res;
    },
  });
};

const useAllAssessmentResults = () => {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["all_assessment_results"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/assessment-results", { token });
      return res?.data ?? res;
    },
  });
};

const Reports = () => {
  const { data: courses, isLoading: loadingCourses } = useCourses();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: departments } = useDepartments();
  const { data: enrollments, isLoading: loadingEnrollments } = useAllEnrollments();
  const { data: assessmentResults } = useAllAssessmentResults();

  const isLoading = loadingCourses || loadingProfiles || loadingEnrollments;

  const profileMap = useMemo(() => {
    const map = new Map<string, any>();
    (profiles || []).forEach((profile) => map.set(String(profile.user_id), profile));
    return map;
  }, [profiles]);

  const profileDeptMap = useMemo(() => {
    const map = new Map<string, string>();
    (profiles || []).forEach((profile) => {
      const embeddedDepartment = profile.departments?.name;
      if (embeddedDepartment) {
        map.set(String(profile.user_id), embeddedDepartment);
        return;
      }
      if (profile.department_id) {
        const dept = (departments || []).find((d) => String(d.id) === String(profile.department_id));
        if (dept) map.set(String(profile.user_id), dept.name);
      }
    });
    return map;
  }, [profiles, departments]);

  const metrics = useMemo(() => {
    const totalEnrollments = enrollments?.length || 0;
    const completed = (enrollments || []).filter((e) => e.status === "completed").length;
    const avgProgress = totalEnrollments > 0
      ? Math.round((enrollments || []).reduce((sum, e) => sum + Number(e.progress || 0), 0) / totalEnrollments)
      : 0;
    const passedAssessments = (assessmentResults || []).filter((result) => result.passed).length;
    const totalAssessments = assessmentResults?.length || 0;

    return [
      { label: "Employees", value: String(profiles?.length || 0), icon: Users },
      { label: "Courses", value: String(courses?.length || 0), icon: BookOpen },
      { label: "Total Enrollments", value: String(totalEnrollments), icon: BookOpen },
      { label: "Completed", value: String(completed), icon: Award },
      { label: "Avg. Progress", value: `${avgProgress}%`, icon: TrendingUp },
      {
        label: "Assessment Pass Rate",
        value: totalAssessments > 0 ? `${Math.round((passedAssessments / totalAssessments) * 100)}%` : "0%",
        icon: Target,
      },
    ];
  }, [courses, profiles, enrollments, assessmentResults]);

  const departmentData = useMemo(() => {
    const deptStats = new Map<string, { enrolled: number; completed: number; employees: Set<string> }>();
    (profiles || []).forEach((profile) => {
      const department = profileDeptMap.get(String(profile.user_id)) || "Unassigned";
      const stats = deptStats.get(department) || { enrolled: 0, completed: 0, employees: new Set<string>() };
      stats.employees.add(String(profile.user_id));
      deptStats.set(department, stats);
    });
    (enrollments || []).forEach((enrollment) => {
      const department = profileDeptMap.get(String(enrollment.user_id)) || "Unassigned";
      const stats = deptStats.get(department) || { enrolled: 0, completed: 0, employees: new Set<string>() };
      stats.enrolled++;
      if (enrollment.status === "completed") stats.completed++;
      deptStats.set(department, stats);
    });
    return Array.from(deptStats.entries())
      .map(([department, stats]) => ({
        department,
        employees: stats.employees.size,
        enrolled: stats.enrolled,
        completed: stats.completed,
        completionRate: stats.enrolled > 0 ? Math.round((stats.completed / stats.enrolled) * 100) : 0,
      }))
      .sort((a, b) => b.enrolled - a.enrolled || a.department.localeCompare(b.department));
  }, [profiles, enrollments, profileDeptMap]);

  const assignedDepartmentData = useMemo(
    () => departmentData.filter((row) => row.department !== "Unassigned"),
    [departmentData],
  );

  const categoryData = useMemo(() => {
    const catCount = new Map<string, number>();
    (enrollments || []).forEach((enrollment) => {
      const category = enrollment.courses?.category || "Uncategorized";
      catCount.set(category, (catCount.get(category) || 0) + 1);
    });
    return Array.from(catCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [enrollments]);

  const enrollmentTrend = useMemo(() => {
    const months: { month: string; enrolled: number; completed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      months.push({
        month: date.toLocaleString("default", { month: "short", year: "2-digit" }),
        enrolled: (enrollments || []).filter((enrollment) => {
          const enrolledAt = new Date(enrollment.enrolled_at);
          return enrolledAt.getFullYear() === year && enrolledAt.getMonth() === month;
        }).length,
        completed: (enrollments || []).filter((enrollment) => {
          if (!enrollment.completed_at) return false;
          const completedAt = new Date(enrollment.completed_at);
          return completedAt.getFullYear() === year && completedAt.getMonth() === month;
        }).length,
      });
    }
    return months;
  }, [enrollments]);

  const courseSummary = useMemo(() => {
    const courseStats = new Map<string, { course: string; category: string; enrolled: number; completed: number; avgProgress: number }>();
    (courses || []).forEach((course) => {
      courseStats.set(String(course.id), {
        course: course.title,
        category: course.category || "Uncategorized",
        enrolled: 0,
        completed: 0,
        avgProgress: 0,
      });
    });
    (enrollments || []).forEach((enrollment) => {
      const key = String(enrollment.course_id);
      const stats = courseStats.get(key) || {
        course: enrollment.courses?.title || "Unknown course",
        category: enrollment.courses?.category || "Uncategorized",
        enrolled: 0,
        completed: 0,
        avgProgress: 0,
      };
      stats.enrolled++;
      stats.avgProgress += Number(enrollment.progress || 0);
      if (enrollment.status === "completed") stats.completed++;
      courseStats.set(key, stats);
    });
    return Array.from(courseStats.values())
      .map((stats) => ({
        ...stats,
        avgProgress: stats.enrolled > 0 ? Math.round(stats.avgProgress / stats.enrolled) : 0,
        completionRate: stats.enrolled > 0 ? Math.round((stats.completed / stats.enrolled) * 100) : 0,
      }))
      .sort((a, b) => b.enrolled - a.enrolled || a.course.localeCompare(b.course));
  }, [courses, enrollments]);

  const assessmentSummary = useMemo(() => {
    const total = assessmentResults?.length || 0;
    const passed = (assessmentResults || []).filter((result) => result.passed).length;
    return [
      { name: "Passed", value: passed },
      { name: "Not Passed", value: Math.max(total - passed, 0) },
    ].filter((item) => item.value > 0);
  }, [assessmentResults]);

  const enrollmentRows = useMemo(() => {
    return (enrollments || []).map((enrollment) => {
      const profile = profileMap.get(String(enrollment.user_id));
      return {
        Employee: profile?.full_name || `User ${enrollment.user_id}`,
        Email: profile?.user_email || "",
        Department: profileDeptMap.get(String(enrollment.user_id)) || "Unassigned",
        Course: enrollment.courses?.title || "Unknown course",
        Category: enrollment.courses?.category || "Uncategorized",
        Status: enrollment.status || "",
        Progress: `${Number(enrollment.progress || 0)}%`,
        Enrolled: enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : "",
        Completed: enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : "",
      };
    });
  }, [enrollments, profileMap, profileDeptMap]);

  const exportExcel = () => {
    const metricRows = metrics.map((metric) => ({ Metric: metric.label, Value: metric.value }));
    const departmentRows = assignedDepartmentData.map((row) => ({
      Department: row.department,
      Employees: row.employees,
      Enrollments: row.enrolled,
      Completed: row.completed,
      "Completion Rate": `${row.completionRate}%`,
    }));
    const courseRows = courseSummary.map((row) => ({
      Course: row.course,
      Category: row.category,
      Enrollments: row.enrolled,
      Completed: row.completed,
      "Avg Progress": `${row.avgProgress}%`,
      "Completion Rate": `${row.completionRate}%`,
    }));

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #123766; }
            h2 { margin-top: 24px; color: #123766; }
            table { border-collapse: collapse; margin-bottom: 18px; }
            th { background: #123766; color: #ffffff; font-weight: 700; }
            th, td { padding: 6px 10px; border: 1px solid #b9c3d0; }
          </style>
        </head>
        <body>
          <h1>CBS Staff LMS Reports</h1>
          <p>Generated: ${escapeExcel(new Date().toLocaleString())}</p>
          ${tableToHtml("Summary", ["Metric", "Value"], metricRows)}
          ${tableToHtml("Department Performance", ["Department", "Employees", "Enrollments", "Completed", "Completion Rate"], departmentRows)}
          ${tableToHtml("Course Performance", ["Course", "Category", "Enrollments", "Completed", "Avg Progress", "Completion Rate"], courseRows)}
          ${tableToHtml("Enrollment Records", ["Employee", "Email", "Department", "Course", "Category", "Status", "Progress", "Enrolled", "Completed"], enrollmentRows)}
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cbs-lms-report-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => <Skeleton key={index} className="h-72" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Current training performance from LMS records</p>
        </div>
        <Button onClick={exportExcel} className="gap-2 sm:w-auto">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg p-2 bg-primary/10 text-primary">
                  <metric.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-display font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Training by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedDepartmentData.some((row) => row.enrolled > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={assignedDepartmentData.filter((row) => row.enrolled > 0).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="enrolled" fill="hsl(215, 80%, 28%)" name="Enrolled" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="hsl(170, 60%, 40%)" name="Completed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">No department enrollments yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Enrollment & Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="enrolled" stroke="hsl(215, 80%, 28%)" strokeWidth={2} dot={{ r: 4 }} name="Enrolled" />
                  <Line type="monotone" dataKey="completed" stroke="hsl(170, 60%, 40%)" strokeWidth={2} dot={{ r: 4 }} name="Completed" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Enrollments by Category</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">No enrollment data yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Assessment Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {assessmentSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={assessmentSummary} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {assessmentSummary.map((_, index) => (
                        <Cell key={index} fill={index === 0 ? "hsl(170, 60%, 40%)" : "hsl(0, 72%, 51%)"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">No assessment attempts yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Course Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courseSummary.length > 0 ? (
                courseSummary.slice(0, 8).map((course) => (
                  <div key={`${course.course}-${course.category}`}>
                    <div className="flex justify-between gap-3 text-sm mb-1">
                      <span className="truncate">{course.course}</span>
                      <span className="font-medium shrink-0">{course.enrolled} enrolled - {course.completionRate}% complete</span>
                    </div>
                    <Progress value={course.completionRate} className="h-2" />
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No courses available.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Department Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Department</th>
                      <th className="py-2 pr-3 font-medium">Employees</th>
                      <th className="py-2 pr-3 font-medium">Enrollments</th>
                      <th className="py-2 font-medium">Complete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedDepartmentData.slice(0, 8).map((row) => (
                      <tr key={row.department} className="border-b last:border-0">
                        <td className="py-2 pr-3">{row.department}</td>
                        <td className="py-2 pr-3">{row.employees}</td>
                        <td className="py-2 pr-3">{row.enrolled}</td>
                        <td className="py-2">{row.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;
