import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartments } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch } from "@/integrations/api/client";
import { JOB_TITLES } from "@/lib/jobTitles";
import { LOCATIONS } from "@/lib/locations";

const useMyProfile = () => {
  const { user, token } = useAuth();
  return useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/lms/profiles/me", { token });
      return res?.data ?? res;
    },
    enabled: !!user && !!token,
  });
};

const Profile = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const { data: departments } = useDepartments();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    employee_id: "",
    department_id: "",
    location: "",
    phone: "",
    date_of_joining: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        job_title: profile.job_title || "",
        employee_id: profile.employee_id || "",
        department_id: profile.department_id ? String(profile.department_id) : "",
        location: profile.location || "",
        phone: profile.phone || "",
        date_of_joining: profile.date_of_joining
          ? String(profile.date_of_joining).slice(0, 10)
          : "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await apiFetch<any>("/api/lms/profiles/me", {
        method: "PUT",
        token,
        body: {
          full_name: form.full_name,
          job_title: form.job_title || null,
          employee_id: form.employee_id || null,
          department_id: form.department_id || null,
          location: form.location || null,
          phone: form.phone || null,
          date_of_joining: form.date_of_joining || null,
        },
      });
      toast({ title: t("profile.saved") });
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const initials = form.full_name
    ? form.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("profile.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("profile.subtitle")}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </div>
              <div>
                <CardTitle className="font-display">{form.full_name || "User"}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("profile.fullName")}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("profile.jobTitle")}</Label>
                <Select
                  value={form.job_title || "__none__"}
                  onValueChange={(v) => setForm({ ...form, job_title: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select</SelectItem>
                    {form.job_title && !JOB_TITLES.includes(form.job_title as (typeof JOB_TITLES)[number]) && (
                      <SelectItem value={form.job_title}>{form.job_title}</SelectItem>
                    )}
                    {JOB_TITLES.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("profile.employeeId")}</Label>
                <Input
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  placeholder="e.g. CBS-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("profile.location")}</Label>
                <Select
                  value={form.location || "__none__"}
                  onValueChange={(v) => setForm({ ...form, location: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select</SelectItem>
                    {form.location && !LOCATIONS.includes(form.location as (typeof LOCATIONS)[number]) && (
                      <SelectItem value={form.location}>{form.location}</SelectItem>
                    )}
                    {LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("profile.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+252 ..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("profile.dateOfJoining")}</Label>
              <Input
                type="date"
                value={form.date_of_joining}
                onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("profile.department")}</Label>
              <Select
                value={form.department_id || "__none__"}
                onValueChange={(v) => setForm({ ...form, department_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-</SelectItem>
                  {(departments || []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || !form.full_name} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;
