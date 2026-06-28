import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Star, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/integrations/api/client";

const useMyTrainingHistory = () => {
  const { user, token } = useAuth();
  return useQuery({
    queryKey: ["training_history", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/training-history/me", { token });
      return res?.data ?? res;
    },
    enabled: !!user && !!token,
  });
};

const statusColors: Record<string, string> = {
  attended: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  partial: "bg-warning/10 text-warning",
};

const TrainingHistory = () => {
  const { t } = useLanguage();
  const { data: history, isLoading } = useMyTrainingHistory();

  const records = history || [];
  const totalCost = records.reduce((s, r) => s + Number(r.cost || 0), 0);
  const avgSatisfaction = records.length > 0
    ? (records.reduce((s, r) => s + (r.satisfaction_score || 0), 0) / records.filter(r => r.satisfaction_score).length || 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          {t("trainingHistory.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("trainingHistory.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{records.length}</p>
              <p className="text-xs text-muted-foreground">Total Trainings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-warning/10 text-warning">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{avgSatisfaction ? avgSatisfaction.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Satisfaction</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-success/10 text-success">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">${totalCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Investment</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Satisfaction</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.training_title}</p>
                          {record.feedback && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{record.feedback}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{record.training_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{record.provider || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {record.start_date ? new Date(record.start_date).toLocaleDateString() : "—"}
                        {record.end_date && ` – ${new Date(record.end_date).toLocaleDateString()}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${statusColors[record.attendance_status || "attended"]} border-0 text-xs capitalize`}>
                          {record.attendance_status || "attended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.satisfaction_score ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-sm">{record.satisfaction_score}/5</span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">${Number(record.cost || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No training history records yet.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default TrainingHistory;
