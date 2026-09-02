import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Award } from "lucide-react";
import { useProfiles } from "@/hooks/useData";
import { Skeleton } from "@/components/ui/skeleton";

const Employees = () => {
  const [search, setSearch] = useState("");
  const { data: profiles, isLoading } = useProfiles();

  const filtered = (profiles || []).filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.departments?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Employees</h1>
          <p className="text-muted-foreground mt-1">{profiles?.length || 0} staff members</p>
        </div>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add Employee</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Employee ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => (
                    <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {emp.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.job_title || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp.departments?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.job_title || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.employee_id || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No employees found.
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

export default Employees;
