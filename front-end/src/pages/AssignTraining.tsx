import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCourses, useTeamProfiles, useAssignTraining } from "@/hooks/useData";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPlus } from "lucide-react";

const AssignTraining = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: courses, isLoading: loadingCourses } = useCourses();
  const { data: team, isLoading: loadingTeam } = useTeamProfiles();
  const assignMutation = useAssignTraining();
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [required, setRequired] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(userId);
    const cid = Number(courseId);
    if (!uid || !cid) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    let due: string | null = null;
    if (dueAt) {
      const d = new Date(dueAt);
      due = Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace("T", " ");
    }
    try {
      await assignMutation.mutateAsync({
        user_id: uid,
        course_id: cid,
        due_at: due,
        is_required: required,
      });
      toast({ title: t("assignTraining.success") });
      setCourseId("");
      setDueAt("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loadingCourses || loadingTeam) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("assignTraining.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("assignTraining.subtitle")}</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">{t("assignTraining.cardTitle")}</CardTitle>
            </div>
            <CardDescription>{t("assignTraining.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("assignTraining.learner")}</Label>
                <Select value={userId} onValueChange={setUserId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("assignTraining.pickLearner")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(team || []).map((p: any) => (
                      <SelectItem key={p.user_id} value={String(p.user_id)}>
                        {p.full_name}
                        {p.employee_id ? ` (${p.employee_id})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("assignTraining.course")}</Label>
                <Select value={courseId} onValueChange={setCourseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("assignTraining.pickCourse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(courses || []).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("assignTraining.dueDate")}</Label>
                <input
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="req" checked={required} onCheckedChange={(v) => setRequired(v === true)} />
                <Label htmlFor="req" className="font-normal cursor-pointer">
                  {t("assignTraining.required")}
                </Label>
              </div>
              <Button type="submit" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? t("common.loading") : t("assignTraining.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AssignTraining;
