import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, UserPlus, BookOpen, Plus, Trash2, Save, Upload, Image, FileText, Loader2, Pencil, Eye, EyeOff } from "lucide-react";
import { useProfiles, useDepartments, useUserRoles, useAssignRole, useRemoveRole, useCreateUser, useCourses } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_URL } from "@/integrations/api/client";
import { hasAnyRole } from "@/lib/roles";
import { ADMIN_COURSE_CATEGORIES } from "@/lib/courseCategories";
import { CourseCreationWizard } from "@/components/admin/CourseCreationWizard";
import { JOB_TITLES } from "@/lib/jobTitles";
import { LOCATIONS } from "@/lib/locations";

type AppRole = "sysadmin" | "instructor" | "manager" | "learner";

const roleBadgeColors: Record<AppRole, string> = {
  sysadmin: "bg-destructive/10 text-destructive",
  instructor: "bg-warning/10 text-warning",
  manager: "bg-primary/10 text-primary",
  learner: "bg-success/10 text-success",
};

const AdminPanel = () => {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isSysadmin = hasAnyRole(user?.roles, ["sysadmin"]);
  const isInstructor = hasAnyRole(user?.roles, ["instructor"]);
  const isManager = hasAnyRole(user?.roles, ["manager"]);
  const queryClient = useQueryClient();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: allRoles, isLoading: loadingRoles } = useUserRoles();
  const { data: departments } = useDepartments();
  const { data: courses, isLoading: loadingCourses } = useCourses();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const createUser = useCreateUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(isSysadmin || isManager ? "users" : "courses");
  const [editCourseId, setEditCourseId] = useState<string | number | null>(null);

  useEffect(() => {
    const requestedEditCourseId = searchParams.get("editCourseId");
    if (requestedEditCourseId) {
      setEditCourseId(requestedEditCourseId);
      setActiveTab("courses");
    }
  }, [searchParams]);

  const exitEditMode = () => {
    setEditCourseId(null);
    if (searchParams.has("editCourseId")) {
      navigate("/admin", { replace: true });
    }
  };

  // Role assignment
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("learner");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "learner" as AppRole,
    employee_id: "",
    job_title: "",
    department_id: "",
    location: "",
    phone: "",
    date_of_joining: "",
  });

  // Course creation state
  const [courseForm, setCourseForm] = useState({
    title: "", description: "", category: "Onboarding", level: "",
    duration_hours: 1, modules_count: 1, is_mandatory: false, is_prerequisite_for_overseas: false,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Module management
  const [moduleForm, setModuleForm] = useState({
    title: "",
    content: "",
    video_url: "",
    resource_url: "",
    resource_name: "",
    duration_minutes: 30,
  });
  const [modules, setModules] = useState<
    { title: string; content: string; video_url?: string; resource_url?: string; resource_name?: string; duration_minutes: number }[]
  >([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);

  // Assessment management
  const [assessmentForm, setAssessmentForm] = useState({ title: "", description: "", passing_score: 70, time_limit_minutes: 30 });
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correct_answer: string }[]>([]);
  const [questionForm, setQuestionForm] = useState({ question: "", opt1: "", opt2: "", opt3: "", opt4: "", correct_answer: "" });

  const rolesMap = new Map<string, { id: string; role: AppRole }[]>();
  (allRoles || []).forEach((r) => {
    const list = rolesMap.get(r.user_id) || [];
    list.push({ id: r.id, role: r.role });
    rolesMap.set(r.user_id, list);
  });

  const filtered = (profiles || []).filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.departments?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAssignRole = async () => {
    if (!selectedUserId) return;
    try {
      await assignRole.mutateAsync({ userId: selectedUserId, role: selectedRole });
      toast({ title: "Role assigned", description: `${selectedRole} role assigned successfully.` });
      setSelectedUserId(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openCreateUserDialog = () => {
    setShowNewUserPassword(false);
    setNewUser((prev) => ({ ...prev, password: "" }));
    setCreateUserOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast({ title: "Full name, email, and password are required", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({
        ...newUser,
        full_name: newUser.full_name.trim(),
        email: newUser.email.trim(),
        department_id: newUser.department_id || undefined,
      });
      toast({ title: "User created", description: `${newUser.full_name} can now sign in.` });
      setCreateUserOpen(false);
      setShowNewUserPassword(false);
      setNewUser({
        full_name: "",
        email: "",
        password: "",
        role: "learner",
        employee_id: "",
        job_title: "",
        department_id: "",
        location: "",
        phone: "",
        date_of_joining: "",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      await removeRole.mutateAsync(roleId);
      toast({ title: "Role removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const addModule = () => {
    if (!moduleForm.title) return;
    setModules([...modules, { ...moduleForm }]);
    setModuleForm({ title: "", content: "", video_url: "", resource_url: "", resource_name: "", duration_minutes: 30 });
  };

  const uploadModuleFile = async (file: File, kind: "video" | "resource") => {
    if (!token) throw new Error("Not authenticated");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/lms/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }
    const payload = await res.json();
    const url = payload?.data?.url;
    if (!url) throw new Error("Upload URL missing");

    if (kind === "video") {
      setModuleForm((prev) => ({ ...prev, video_url: url }));
    } else {
      setModuleForm((prev) => ({ ...prev, resource_url: url, resource_name: prev.resource_name || file.name }));
    }
  };

  const addQuestion = () => {
    if (!questionForm.question || !questionForm.correct_answer) return;
    const options = [questionForm.opt1, questionForm.opt2, questionForm.opt3, questionForm.opt4].filter(Boolean);
    setQuestions([...questions, { question: questionForm.question, options, correct_answer: questionForm.correct_answer }]);
    setQuestionForm({ question: "", opt1: "", opt2: "", opt3: "", opt4: "", correct_answer: "" });
  };

  const handleCreateCourse = async () => {
    if (!courseForm.title) return;
    setCreating(true);
    try {
      if (!token) throw new Error("Not authenticated");

      // Include a pending question if the instructor filled the form but forgot to click Add.
      let finalQuestions = [...questions];
      if (
        assessmentForm.title &&
        questionForm.question &&
        questionForm.correct_answer &&
        !finalQuestions.some((q) => q.question === questionForm.question)
      ) {
        const options = [questionForm.opt1, questionForm.opt2, questionForm.opt3, questionForm.opt4].filter(Boolean);
        finalQuestions = [
          ...finalQuestions,
          { question: questionForm.question, options, correct_answer: questionForm.correct_answer },
        ];
      }

      // Supabase storage is removed; thumbnail upload is disabled for now.
      if (thumbnailFile) {
        toast({
          title: "Thumbnail disabled",
          description: "Local course media upload is not implemented yet; the course will be created without a thumbnail.",
        });
      }

      await apiFetch("/api/lms/courses/full", {
        method: "POST",
        token,
        body: {
          ...courseForm,
          modules_count: modules.length || courseForm.modules_count,
          created_by: user?.id,
          status: "Published",
          thumbnail_url: null,
          modules,
          assessment: assessmentForm.title ? assessmentForm : null,
          questions: finalQuestions,
        },
      });

      toast({
        title: "Course created!",
        description: `"${courseForm.title}" with ${modules.length} modules has been added.`,
      });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      // Reset
      setCourseForm({ title: "", description: "", category: "Onboarding", level: "", duration_hours: 1, modules_count: 1, is_mandatory: false, is_prerequisite_for_overseas: false });
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setModules([]);
      setAssessmentForm({ title: "", description: "", passing_score: 70, time_limit_minutes: 30 });
      setQuestions([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> {isSysadmin || isManager ? "User Management" : "Instructor Studio"}
          </h1>
          <p className="text-muted-foreground mt-1">{isSysadmin || isManager ? "Manage users, employee details, and roles" : "Manage your courses and assessments"}</p>
        </div>
        {isSysadmin && activeTab === "users" && (
          <Button className="gap-2 shrink-0" onClick={openCreateUserDialog}>
            <UserPlus className="h-4 w-4" /> Create User
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (value !== "courses") setEditCourseId(null);
        }}
        className="space-y-4"
      >
        {(isSysadmin || isManager) ? null : (
          <TabsList>
            <TabsTrigger value="catalog" className="gap-1.5"><FileText className="h-4 w-4" /> All Courses</TabsTrigger>
          </TabsList>
        )}

        {/* USER MANAGEMENT TAB */}
        {(isSysadmin || isManager) && <TabsContent value="users" className="space-y-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Dialog
            open={createUserOpen}
            onOpenChange={(open) => {
              setCreateUserOpen(open);
              if (open) {
                setShowNewUserPassword(false);
                setNewUser((prev) => ({ ...prev, password: "" }));
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">Create User</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 [&_label]:font-bold [&_label]:text-foreground">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password *</Label>
                  <div className="relative">
                    <Input
                      type={showNewUserPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      autoComplete="new-password"
                      name="new-user-temporary-password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={showNewUserPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sysadmin">Sysadmin</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="learner">Learner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input value={newUser.employee_id} onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Select
                    value={newUser.job_title || "__none__"}
                    onValueChange={(v) => setNewUser({ ...newUser, job_title: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select</SelectItem>
                      {JOB_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>{title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newUser.department_id || "none"} onValueChange={(value) => setNewUser({ ...newUser, department_id: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {(departments || []).map((department: any) => (
                        <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={newUser.location || "__none__"}
                    onValueChange={(v) => setNewUser({ ...newUser, location: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select</SelectItem>
                      {LOCATIONS.map((location) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input type="date" value={newUser.date_of_joining} onChange={(e) => setNewUser({ ...newUser, date_of_joining: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateUserOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser} disabled={createUser.isPending} className="gap-2">
                  {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {loadingProfiles || loadingRoles ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="[&_th]:font-bold [&_th]:text-foreground">
                        <TableHead>User</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Current Roles</TableHead>
                        {isSysadmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((profile) => {
                        const userRoles = rolesMap.get(profile.user_id) || [];
                        return (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                  {profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{profile.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{profile.job_title || "No job title"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{profile.employee_id || "-"}</TableCell>
                            <TableCell className="text-sm">{profile.job_title || "-"}</TableCell>
                            <TableCell className="text-sm">{profile.departments?.name || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {userRoles.length === 0 && <span className="text-xs text-muted-foreground italic">No role</span>}
                                {userRoles.map((ur) => (
                                  <Badge
                                    key={ur.id}
                                    variant="secondary"
                                    className={`${roleBadgeColors[ur.role]} gap-1 ${isSysadmin ? "cursor-pointer group" : ""}`}
                                    onClick={() => isSysadmin && handleRemoveRole(ur.id)}
                                  >
                                    {ur.role}
                                    {isSysadmin && <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            {isSysadmin && <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedUserId(profile.user_id)}>
                                    <Plus className="h-3.5 w-3.5" /> Assign Role
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className="font-display">Assign Role to {profile.full_name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Select Role</Label>
                                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="sysadmin">Sysadmin</SelectItem>
                                          <SelectItem value="instructor">Instructor</SelectItem>
                                          <SelectItem value="learner">Learner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <DialogClose asChild>
                                      <Button onClick={handleAssignRole} disabled={assignRole.isPending} className="gap-1.5">
                                        <Save className="h-4 w-4" /> Assign
                                      </Button>
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>}
                          </TableRow>
                        );
                      })}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isSysadmin ? 6 : 5} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>}

        {/* COURSE EDITOR TAB */}
        <TabsContent value="courses" className="space-y-4">
          <CourseCreationWizard
            token={token}
            userId={user?.id}
            editCourseId={editCourseId}
            onExitEdit={exitEditMode}
          />
          <div className="hidden">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" /> Course Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Course Title *</Label>
                    <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Advanced Risk Management" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} />
                  </div>

                  {/* Thumbnail Upload */}
                  <div className="space-y-2">
                    <Label>Thumbnail Image</Label>
                    <div className="flex items-center gap-4">
                      {thumbnailPreview ? (
                        <img src={thumbnailPreview} alt="Preview" className="h-20 w-32 object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="h-20 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                          <div className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                            <Upload className="h-4 w-4" /> Upload image
                          </div>
                        </Label>
                        <input id="thumbnail-upload" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={courseForm.category} onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ADMIN_COURSE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (hours)</Label>
                      <Input type="number" min={0.5} step={0.5} value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Modules Count</Label>
                      <Input type="number" min={1} value={modules.length || courseForm.modules_count} disabled={modules.length > 0} onChange={(e) => setCourseForm({ ...courseForm, modules_count: parseInt(e.target.value) || 1 })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={courseForm.is_mandatory} onCheckedChange={(v) => setCourseForm({ ...courseForm, is_mandatory: v })} />
                      <Label>Mandatory</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={courseForm.is_prerequisite_for_overseas} onCheckedChange={(v) => setCourseForm({ ...courseForm, is_prerequisite_for_overseas: v })} />
                      <Label>Overseas Prerequisite</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modules */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Add Modules</CardTitle>
                    <CardDescription>Add learning modules to this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input placeholder="Module title" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} />
                    <Textarea placeholder="Module content..." value={moduleForm.content} onChange={(e) => setModuleForm({ ...moduleForm, content: e.target.value })} rows={2} />
                    <Input
                      placeholder="Video URL (mp4/webm or hosted link)"
                      value={moduleForm.video_url}
                      onChange={(e) => setModuleForm({ ...moduleForm, video_url: e.target.value })}
                    />
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingVideo(true);
                            await uploadModuleFile(file, "video");
                            toast({ title: "Video uploaded", description: "Video link attached to this module." });
                          } catch (error: any) {
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          } finally {
                            setUploadingVideo(false);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      {uploadingVideo && <span className="text-xs text-muted-foreground">Uploading...</span>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Resource URL (PDF/PPT)"
                        value={moduleForm.resource_url}
                        onChange={(e) => setModuleForm({ ...moduleForm, resource_url: e.target.value })}
                      />
                      <Input
                        placeholder="Resource Name (e.g. Policy Handbook.pdf)"
                        value={moduleForm.resource_name}
                        onChange={(e) => setModuleForm({ ...moduleForm, resource_name: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingResource(true);
                            await uploadModuleFile(file, "resource");
                            toast({ title: "File uploaded", description: "Resource link attached to this module." });
                          } catch (error: any) {
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          } finally {
                            setUploadingResource(false);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      {uploadingResource && <span className="text-xs text-muted-foreground">Uploading...</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input type="number" min={5} className="w-32" value={moduleForm.duration_minutes} onChange={(e) => setModuleForm({ ...moduleForm, duration_minutes: parseInt(e.target.value) || 30 })} />
                      <span className="text-sm text-muted-foreground">minutes</span>
                      <Button size="sm" onClick={addModule} disabled={!moduleForm.title} className="gap-1 ml-auto">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                    {modules.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {modules.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                            <span>
                              {i + 1}. {m.title} ({m.duration_minutes}min)
                              {m.video_url ? " • video" : ""}
                              {m.resource_url ? " • file" : ""}
                            </span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setModules(modules.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Assessment (Optional)</CardTitle>
                    <CardDescription>Add a quiz for this course</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input placeholder="Assessment title" value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Passing Score (%)</Label>
                        <Input type="number" min={50} max={100} value={assessmentForm.passing_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, passing_score: parseInt(e.target.value) || 70 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time Limit (min)</Label>
                        <Input type="number" min={5} value={assessmentForm.time_limit_minutes} onChange={(e) => setAssessmentForm({ ...assessmentForm, time_limit_minutes: parseInt(e.target.value) || 30 })} />
                      </div>
                    </div>

                    {assessmentForm.title && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <Label className="text-xs font-medium">Add Questions</Label>
                        <Input placeholder="Question text" value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Option A" value={questionForm.opt1} onChange={(e) => setQuestionForm({ ...questionForm, opt1: e.target.value })} />
                          <Input placeholder="Option B" value={questionForm.opt2} onChange={(e) => setQuestionForm({ ...questionForm, opt2: e.target.value })} />
                          <Input placeholder="Option C" value={questionForm.opt3} onChange={(e) => setQuestionForm({ ...questionForm, opt3: e.target.value })} />
                          <Input placeholder="Option D" value={questionForm.opt4} onChange={(e) => setQuestionForm({ ...questionForm, opt4: e.target.value })} />
                        </div>
                        <Select value={questionForm.correct_answer} onValueChange={(v) => setQuestionForm({ ...questionForm, correct_answer: v })}>
                          <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                          <SelectContent>
                            {[questionForm.opt1, questionForm.opt2, questionForm.opt3, questionForm.opt4].filter(Boolean).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={addQuestion} disabled={!questionForm.question || !questionForm.correct_answer} className="gap-1">
                          <Plus className="h-3.5 w-3.5" /> Add Question
                        </Button>
                        {questions.length > 0 && (
                          <div className="space-y-1">
                            {questions.map((q, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                                <span>Q{i + 1}: {q.question.substring(0, 50)}...</span>
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={handleCreateCourse} disabled={!courseForm.title || creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </motion.div>
          </div>
        </TabsContent>

        {/* ALL COURSES TAB */}
        <TabsContent value="catalog" className="space-y-4">
          {loadingCourses ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(courses || []).map((course) => {
                        const hasOwner = course.created_by_user_id !== null && course.created_by_user_id !== undefined && course.created_by_user_id !== "";
                        const ownerId = Number(course.created_by_user_id);
                        const canEditThisCourse =
                          isSysadmin ||
                          (isInstructor && (!hasOwner || ownerId === Number(user?.id)));
                        return (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {course.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt="" className="h-10 w-16 object-cover rounded" />
                              ) : (
                                <div className="h-10 w-16 rounded bg-primary/10 flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-primary/30" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{course.title}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{course.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{course.category}</Badge></TableCell>
                          <TableCell className="text-sm">{course.duration_hours}h • {course.modules_count} modules</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{course.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {canEditThisCourse && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => {
                                  setEditCourseId(course.id);
                                  setActiveTab("courses");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                      {(courses || []).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No courses yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;



