import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamEnrollments, useTeamProfiles } from "@/hooks/useData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyRole } from "@/lib/roles";
import { Users } from "lucide-react";

const TeamTraining = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: enrollments, isLoading: loadE } = useTeamEnrollments();
  const { data: team, isLoading: loadT } = useTeamProfiles();
  const broad = hasAnyRole(user?.roles, ["sysadmin", "instructor"]);

  const byLearner = useMemo(() => {
    const map = new Map<number, { name: string; items: any[]; sum: number; n: number }>();
    (enrollments || []).forEach((e: any) => {
      const id = Number(e.learner_user_id);
      if (!id) return;
      const name = e.learner_name || `User ${id}`;
      if (!map.has(id)) map.set(id, { name, items: [], sum: 0, n: 0 });
      const g = map.get(id)!;
      g.items.push(e);
      g.sum += Number(e.progress || 0);
      g.n += 1;
    });
    return Array.from(map.entries()).map(([id, v]) => ({
      userId: id,
      name: v.name,
      avgProgress: v.n ? Math.round(v.sum / v.n) : 0,
      open: v.items.filter((x) => x.status !== "completed").length,
      done: v.items.filter((x) => x.status === "completed").length,
    }));
  }, [enrollments]);

  if (loadE || loadT) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("teamTraining.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {broad ? t("teamTraining.subtitleAll") : t("teamTraining.subtitleManager")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("teamTraining.teamMembers")}</p>
              <p className="text-2xl font-display font-bold">{(team || []).length}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("teamTraining.enrollmentRows")}</p>
              <p className="text-2xl font-display font-bold">{(enrollments || []).length}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{t("teamTraining.learnersWithActivity")}</p>
              <p className="text-2xl font-display font-bold">{byLearner.length}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">{t("teamTraining.summaryTitle")}</CardTitle>
            </div>
            <CardDescription>{t("teamTraining.summaryDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("teamTraining.colLearner")}</TableHead>
                  <TableHead>{t("teamTraining.colAvgProgress")}</TableHead>
                  <TableHead>{t("teamTraining.colOpen")}</TableHead>
                  <TableHead>{t("teamTraining.colDone")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byLearner.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("teamTraining.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  byLearner.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[180px]">
                          <Progress value={row.avgProgress} className="h-2" />
                          <span className="text-xs text-muted-foreground w-8">{row.avgProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.open}</TableCell>
                      <TableCell>{row.done}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">{t("teamTraining.detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("teamTraining.colLearner")}</TableHead>
                  <TableHead>{t("teamTraining.colCourse")}</TableHead>
                  <TableHead>{t("teamTraining.colProgress")}</TableHead>
                  <TableHead>{t("teamTraining.colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(enrollments || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("teamTraining.noEnrollments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (enrollments || []).slice(0, 100).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.learner_name || "—"}</TableCell>
                      <TableCell>
                        <Link to={`/courses/${e.course_id}`} className="text-primary hover:underline text-sm">
                          {e.courses?.title || `Course #${e.course_id}`}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[140px]">
                          <Progress value={Number(e.progress)} className="h-2" />
                          <span className="text-xs">{e.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {e.status === "completed" ? t("teamTraining.done") : t("teamTraining.inProgress")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TeamTraining;
