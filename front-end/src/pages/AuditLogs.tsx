import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { API_URL } from "@/integrations/api/client";
import { ScrollText, Download } from "lucide-react";

const PAGE = 50;

const AuditLogs = () => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isFetching } = useAuditLogs(offset, PAGE);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const exportCsv = async () => {
    const res = await fetch(`${API_URL}/api/lms/audit-logs/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("auditLogs.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("auditLogs.subtitle")}</p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          {t("auditLogs.export")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-display">{t("auditLogs.tableTitle")}</CardTitle>
          </div>
          <CardDescription>
            {t("auditLogs.showing")} {rows.length} / {total}
            {isFetching && !isLoading ? " …" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">ID</TableHead>
                    <TableHead className="w-[100px]">{t("auditLogs.actor")}</TableHead>
                    <TableHead>{t("auditLogs.action")}</TableHead>
                    <TableHead>{t("auditLogs.entity")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("auditLogs.meta")}</TableHead>
                    <TableHead className="w-[160px]">{t("auditLogs.when")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.actor_user_id ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{r.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.entity_type || "—"} {r.entity_id != null ? `#${r.entity_id}` : ""}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[240px] truncate">
                        {r.metadata != null ? JSON.stringify(r.metadata) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
                >
                  {t("auditLogs.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE >= total}
                  onClick={() => setOffset((o) => o + PAGE)}
                >
                  {t("auditLogs.next")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
