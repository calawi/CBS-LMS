import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  FileVideo,
  GripVertical,
  HelpCircle,
  ImagePlus,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, API_URL } from "@/integrations/api/client";
import { ADMIN_COURSE_CATEGORIES } from "@/lib/courseCategories";
import { cn } from "@/lib/utils";

type QuestionDraft = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  points: number;
};

type ModuleDraft = {
  title: string;
  content: string;
  video_url: string;
  resource_url: string;
  resource_name: string;
  duration_minutes: number;
  assessment?: {
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number;
    questions: QuestionDraft[];
  } | null;
};

type CourseForm = {
  title: string;
  description: string;
  category: string;
  level: string;
  duration_hours: number;
  modules_count: number;
  is_mandatory: boolean;
  is_prerequisite_for_overseas: boolean;
};

type Props = {
  token: string | null;
  userId?: string;
  editCourseId?: string | number | null;
  onExitEdit?: () => void;
};

const STEPS = ["Course Details", "Modules", "Assessment", "Review"];

const initialCourseForm: CourseForm = {
  title: "",
  description: "",
  category: "Onboarding",
  level: "",
  duration_hours: 1,
  modules_count: 1,
  is_mandatory: false,
  is_prerequisite_for_overseas: false,
};

const initialModuleForm: ModuleDraft = {
  title: "",
  content: "",
  video_url: "",
  resource_url: "",
  resource_name: "",
  duration_minutes: 60,
};

const makeQuestion = (): QuestionDraft => ({
  id: Math.random().toString(36).slice(2, 11),
  question: "",
  options: ["", ""],
  correct_answer: "",
  points: 5,
});

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export function CourseCreationWizard({ token, userId, editCourseId, onExitEdit }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [courseForm, setCourseForm] = useState<CourseForm>(initialCourseForm);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleDraft[]>([]);
  const [moduleForm, setModuleForm] = useState<ModuleDraft>(initialModuleForm);

  useEffect(() => {
    setModuleForm((prev) => {
      if (!prev.title.trim()) {
        return {
          ...prev,
          duration_minutes: Math.round(courseForm.duration_hours * 60) || 60
        };
      }
      return prev;
    });
  }, [courseForm.duration_hours]);

  const [addingModule, setAddingModule] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [includeAssessment, setIncludeAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    description: "",
    passing_score: 70,
    time_limit_minutes: 30,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const isEditing = Boolean(editCourseId);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + Math.max(0, Number(q.points || 0)), 0),
    [questions],
  );

  const passMarks = useMemo(
    () => Math.ceil((totalMarks * Number(assessmentForm.passing_score || 0)) / 100),
    [assessmentForm.passing_score, totalMarks],
  );

  const nextDisabled =
    (currentStep === 0 && !courseForm.title.trim()) ||
    (currentStep === 2 &&
      includeAssessment &&
      (questions.length === 0 ||
        questions.some((q) => !q.question.trim() || !q.correct_answer || q.options.filter(Boolean).length < 2)));

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid thumbnail", description: "Please upload an image file.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      toast({ title: "Thumbnail too large", description: "Please upload an image up to 5MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
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
      setModuleForm((prev) => ({
        ...prev,
        resource_url: url,
        resource_name: prev.resource_name || file.name,
      }));
    }
  };

  const uploadThumbnailFile = async (file: File) => {
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
      throw new Error(text || "Thumbnail upload failed");
    }
    const payload = await res.json();
    const url = payload?.data?.url;
    if (!url) throw new Error("Thumbnail upload URL missing");
    return url;
  };

  const addModule = () => {
    if (!moduleForm.title.trim()) return;
    setModules((prev) => [...prev, moduleForm]);
    setModuleForm({
      ...initialModuleForm,
      duration_minutes: Math.round(courseForm.duration_hours * 60) || 60
    });
    setAddingModule(false);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (question: QuestionDraft, index: number, value: string) => {
    const options = question.options.map((option, i) => (i === index ? value : option));
    const correct_answer = question.correct_answer === question.options[index] ? value : question.correct_answer;
    updateQuestion(question.id, { options, correct_answer });
  };

  const removeOption = (question: QuestionDraft, index: number) => {
    if (question.options.length <= 2) return;
    const removed = question.options[index];
    const options = question.options.filter((_, i) => i !== index);
    updateQuestion(question.id, {
      options,
      correct_answer: question.correct_answer === removed ? "" : question.correct_answer,
    });
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCourseForm(initialCourseForm);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setModules([]);
    setModuleForm(initialModuleForm);
    setAddingModule(true);
    setIncludeAssessment(false);
    setAssessmentForm({ title: "", description: "", passing_score: 70, time_limit_minutes: 30 });
    setQuestions([]);
  };

  useEffect(() => {
    if (!editCourseId || !token) {
      resetForm();
      return;
    }

    let cancelled = false;
    const loadCourseForEdit = async () => {
      setLoadingEdit(true);
      try {
        const courseRes = await apiFetch<any>(`/api/courses/${editCourseId}`, { token });
        const course = courseRes?.data ?? courseRes;
        const modulesRes = await apiFetch<any>(`/api/lms/course-modules/${editCourseId}`, { token });
        const moduleRows = modulesRes?.data ?? modulesRes ?? [];
        const assessmentRes = await apiFetch<any>(`/api/lms/assessments/course/${editCourseId}`, { token });
        const assessment = assessmentRes?.data ?? assessmentRes;
        let questionRows: any[] = [];

        if (assessment?.id) {
          const questionsRes = await apiFetch<any>(`/api/lms/assessment-questions/${assessment.id}`, { token });
          questionRows = questionsRes?.data ?? questionsRes ?? [];
        }

        if (cancelled) return;

        setCurrentStep(0);
        setCourseForm({
          title: course?.title || "",
          description: course?.description || "",
          category: course?.category || "Onboarding",
          level: course?.level || "",
          duration_hours: Number(course?.duration_hours || 1),
          modules_count: Number(course?.modules_count || moduleRows.length || 1),
          is_mandatory: Boolean(course?.is_mandatory),
          is_prerequisite_for_overseas: Boolean(course?.is_prerequisite_for_overseas),
        });
        setThumbnailPreview(course?.thumbnail_url || null);
        setThumbnailFile(null);
        setModules(
          moduleRows.map((module: any) => {
            let parsedAssessment = null;
            if (module.assessment) {
              const questionsList = Array.isArray(module.assessment.questions)
                ? module.assessment.questions
                : JSON.parse(module.assessment.questions || "[]");
              parsedAssessment = {
                title: module.assessment.title || "",
                description: module.assessment.description || "",
                passing_score: Number(module.assessment.passing_score || 70),
                time_limit_minutes: Number(module.assessment.time_limit_minutes || 30),
                questions: questionsList.map((q: any) => {
                  const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
                  return {
                    id: String(q.id || Math.random().toString(36).slice(2, 11)),
                    question: q.question || "",
                    options: options.length >= 2 ? options : ["", ""],
                    correct_answer: q.correct_answer || "",
                    points: Number(q.points || 5),
                  };
                }),
              };
            }
            return {
              title: module.title || "",
              content: module.content || "",
              video_url: module.video_url || "",
              resource_url: module.resource_url || "",
              resource_name: module.resource_name || "",
              duration_minutes: Number(module.duration_minutes || 30),
              assessment: parsedAssessment,
            };
          }),
        );
        setModuleForm(initialModuleForm);
        setAddingModule(moduleRows.length === 0);
        setIncludeAssessment(Boolean(assessment?.id));
        setAssessmentForm({
          title: assessment?.title || "",
          description: assessment?.description || "",
          passing_score: Number(assessment?.passing_score || 70),
          time_limit_minutes: Number(assessment?.time_limit_minutes || 30),
        });
        setQuestions(
          questionRows.map((question: any) => {
            const options = Array.isArray(question.options)
              ? question.options
              : JSON.parse(question.options || "[]");
            return {
              id: String(question.id || Math.random().toString(36).slice(2, 11)),
              question: question.question || "",
              options: options.length >= 2 ? options : ["", ""],
              correct_answer: question.correct_answer || "",
              points: Number(question.points || 5),
            };
          }),
        );
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to load course for editing", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    };

    loadCourseForEdit();
    return () => {
      cancelled = true;
    };
  }, [editCourseId, token]);

  const handleCreateCourse = async () => {
    if (!courseForm.title.trim()) return;
    setCreating(true);
    try {
      if (!token) throw new Error("Not authenticated");

      const thumbnailUrl = thumbnailFile ? await uploadThumbnailFile(thumbnailFile) : thumbnailPreview || null;
      if (thumbnailFile && !thumbnailUrl) {
        throw new Error("Thumbnail upload failed. Course was not saved.");
      }

      await apiFetch(isEditing ? `/api/lms/courses/full/${editCourseId}` : "/api/lms/courses/full", {
        method: isEditing ? "PUT" : "POST",
        token,
        body: {
          ...courseForm,
          modules_count: modules.length || courseForm.modules_count,
          created_by: userId,
          status: "Published",
          thumbnail_url: thumbnailUrl,
          modules,
          assessment: includeAssessment
            ? {
                ...assessmentForm,
                title: assessmentForm.title || `${courseForm.title || "Course"} Assessment`,
                description:
                  assessmentForm.description ||
                  `${questions.length} questions, ${totalMarks} total marks, ${passMarks} pass marks.`,
              }
            : null,
          questions: includeAssessment
            ? questions.map((q) => ({
                question: q.question,
                options: q.options.filter(Boolean),
                correct_answer: q.correct_answer,
                points: Number(q.points || 1),
              }))
            : [],
        },
      });

      toast({
        title: isEditing ? "Course updated" : "Course created",
        description: `"${courseForm.title}" has been ${isEditing ? "updated" : "published"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", String(editCourseId)] });
      queryClient.invalidateQueries({ queryKey: ["course_modules", String(editCourseId)] });
      resetForm();
      if (isEditing) {
        onExitEdit?.();
      } else {
        navigate("/courses");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Instructor Studio</span>
          <span>/</span>
          <span className="font-medium text-foreground">{isEditing ? "Edit Course" : "Create Course"}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-display font-bold">{isEditing ? "Edit Course" : "Create New Course"}</h2>
          {isEditing && (
            <Button variant="outline" size="sm" onClick={onExitEdit}>
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-border/80">
        {loadingEdit ? (
          <CardContent className="flex min-h-[420px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading course...
            </div>
          </CardContent>
        ) : (
        <>
        <div className="border-b border-border bg-muted/20 px-4 py-8 sm:px-8">
          <Stepper currentStep={currentStep} />
        </div>

        <CardContent className="min-h-[440px] p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {currentStep === 0 && (
                <StepDetails
                  courseForm={courseForm}
                  setCourseForm={setCourseForm}
                  thumbnailPreview={thumbnailPreview}
                  onThumbnailChange={handleThumbnailChange}
                />
              )}
              {currentStep === 1 && (
                <StepModules
                  modules={modules}
                  setModules={setModules}
                  moduleForm={moduleForm}
                  setModuleForm={setModuleForm}
                  addingModule={addingModule}
                  setAddingModule={setAddingModule}
                  courseForm={courseForm}
                  uploadModuleFile={uploadModuleFile}
                  uploadingVideo={uploadingVideo}
                  setUploadingVideo={setUploadingVideo}
                  uploadingResource={uploadingResource}
                  setUploadingResource={setUploadingResource}
                />
              )}
              {currentStep === 2 && (
                <StepAssessment
                  includeAssessment={includeAssessment}
                  setIncludeAssessment={setIncludeAssessment}
                  questions={questions}
                  setQuestions={setQuestions}
                  updateQuestion={updateQuestion}
                  updateOption={updateOption}
                  removeOption={removeOption}
                />
              )}
              {currentStep === 3 && (
                <StepReview
                  courseForm={courseForm}
                  modules={modules}
                  includeAssessment={includeAssessment}
                  assessmentForm={assessmentForm}
                  questions={questions}
                  totalMarks={totalMarks}
                  passMarks={passMarks}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <div className="flex items-center justify-between border-t border-border bg-muted/20 p-4 sm:p-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
            disabled={currentStep === 0}
            className={cn("gap-2", currentStep === 0 && "invisible")}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button size="lg" onClick={handleCreateCourse} disabled={creating || !courseForm.title.trim()} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {creating ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Course" : "Create Course"}
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep((step) => Math.min(STEPS.length - 1, step + 1))} disabled={nextDisabled} className="gap-2">
              Next Step <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        </>
        )}
      </Card>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-4 h-0.5 w-full bg-border" />
      <Progress
        value={(currentStep / (STEPS.length - 1)) * 100}
        className="absolute left-0 top-4 z-0 h-0.5 rounded-none bg-transparent"
      />
      <div className="relative z-10 flex items-start justify-between">
        {STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={step} className="flex max-w-[110px] flex-col items-center gap-2 bg-card px-2 text-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                    : isComplete
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-border bg-card text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn("text-xs font-medium", isActive ? "text-primary" : isComplete ? "text-foreground" : "text-muted-foreground")}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepDetails({
  courseForm,
  setCourseForm,
  thumbnailPreview,
  onThumbnailChange,
}: {
  courseForm: CourseForm;
  setCourseForm: React.Dispatch<React.SetStateAction<CourseForm>>;
  thumbnailPreview: string | null;
  onThumbnailChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold">Course Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Provide the basic information for your new course.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Course Category <span className="text-destructive">*</span></Label>
          <Select
            value={courseForm.title}
            onValueChange={(value) =>
              setCourseForm((prev) => ({
                ...prev,
                title: value,
                category: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a training program" />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_COURSE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Briefly describe what this course covers..."
            value={courseForm.description}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[120px]"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Thumbnail Image</Label>
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-border px-6 py-6 transition-colors hover:bg-muted/40">
            <input type="file" accept="image/*" className="hidden" onChange={onThumbnailChange} />
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Course thumbnail preview" className="mx-auto h-36 w-full max-w-md rounded-lg object-cover" />
            ) : (
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="flex justify-center text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Upload a file</span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Duration (hours)</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={courseForm.duration_hours}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, duration_hours: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:gap-8 md:col-span-2">
          <div className="flex items-center gap-3">
            <Switch checked={courseForm.is_mandatory} onCheckedChange={(checked) => setCourseForm((prev) => ({ ...prev, is_mandatory: checked }))} />
            <Label className="mb-0">Mandatory Course</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepModules({
  modules,
  setModules,
  moduleForm,
  setModuleForm,
  addingModule,
  setAddingModule,
  courseForm,
  uploadModuleFile,
  uploadingVideo,
  setUploadingVideo,
  uploadingResource,
  setUploadingResource,
}: {
  modules: ModuleDraft[];
  setModules: React.Dispatch<React.SetStateAction<ModuleDraft[]>>;
  moduleForm: ModuleDraft;
  setModuleForm: React.Dispatch<React.SetStateAction<ModuleDraft>>;
  addingModule: boolean;
  setAddingModule: React.Dispatch<React.SetStateAction<boolean>>;
  courseForm: CourseForm;
  uploadModuleFile: (file: File, kind: "video" | "resource") => Promise<void>;
  uploadingVideo: boolean;
  setUploadingVideo: React.Dispatch<React.SetStateAction<boolean>>;
  uploadingResource: boolean;
  setUploadingResource: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { toast } = useToast();
  const [includeModuleAssessment, setIncludeModuleAssessment] = useState(false);
  const [moduleQuestions, setModuleQuestions] = useState<QuestionDraft[]>([]);

  const updateModuleQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setModuleQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateModuleOption = (question: QuestionDraft, index: number, value: string) => {
    const options = question.options.map((option, i) => (i === index ? value : option));
    const correct_answer = question.correct_answer === question.options[index] ? value : question.correct_answer;
    updateModuleQuestion(question.id, { options, correct_answer });
  };

  const removeModuleOption = (question: QuestionDraft, index: number) => {
    if (question.options.length <= 2) return;
    const removed = question.options[index];
    const options = question.options.filter((_, i) => i !== index);
    updateModuleQuestion(question.id, {
      options,
      correct_answer: question.correct_answer === removed ? "" : question.correct_answer,
    });
  };

  const handleSaveModule = () => {
    if (!moduleForm.title.trim()) return;

    if (includeModuleAssessment) {
      if (moduleQuestions.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one question for the module assessment.",
          variant: "destructive",
        });
        return;
      }
      const invalid = moduleQuestions.some(
        (q) => !q.question.trim() || !q.correct_answer || q.options.filter(Boolean).length < 2
      );
      if (invalid) {
        toast({
          title: "Validation Error",
          description: "Please complete all questions, options, and select correct answers.",
          variant: "destructive",
        });
        return;
      }
    }

    const assessment = includeModuleAssessment
      ? {
          title: `${moduleForm.title} Quiz`,
          description: `Quiz for module: ${moduleForm.title}`,
          passing_score: 80,
          time_limit_minutes: 15,
          questions: moduleQuestions.map((q) => ({
            ...q,
            options: q.options.filter(Boolean),
          })),
        }
      : null;

    setModules((prev) => [...prev, { ...moduleForm, assessment }]);
    setModuleForm({
      ...initialModuleForm,
      duration_minutes: Math.round(courseForm.duration_hours * 60) || 60,
    });
    setIncludeModuleAssessment(false);
    setModuleQuestions([]);
    setAddingModule(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Course Modules</h3>
          <p className="mt-1 text-sm text-muted-foreground">Break your course down into manageable learning modules.</p>
        </div>
        {!addingModule && (
          <Button variant="outline" size="sm" onClick={() => setAddingModule(true)} className="gap-2 self-start">
            <Plus className="h-4 w-4" /> Add Module
          </Button>
        )}
      </div>

      {modules.length > 0 && (
        <div className="space-y-3">
          {modules.map((module, index) => (
            <div key={`${module.title}-${index}`} className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <GripVertical className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="truncate font-medium">
                    <span className="mr-2 text-muted-foreground">Module {index + 1}:</span>
                    {module.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModules((prev) => prev.filter((_, i) => i !== index))}
                    className="text-muted-foreground opacity-100 transition-colors hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove module"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {module.duration_minutes} min</span>
                  {module.video_url && <span className="flex items-center gap-1"><FileVideo className="h-3.5 w-3.5" /> Video included</span>}
                  {module.resource_name && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {module.resource_name}</span>}
                  {module.assessment && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Award className="h-3.5 w-3.5" /> Quiz ({module.assessment.questions?.length || 0} Qs)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {addingModule && (
        <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
          <h4 className="flex items-center gap-2 font-medium">
            <Plus className="h-4 w-4 text-primary" />
            {modules.length === 0 ? "Add your first module" : "Add new module"}
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Module Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Introduction to Policies"
                value={moduleForm.title}
                onChange={(e) => setModuleForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Module Content</Label>
              <Textarea
                placeholder="Detailed content or instructions..."
                value={moduleForm.content}
                onChange={(e) => setModuleForm((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  placeholder="https://..."
                  value={moduleForm.video_url}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, video_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Upload Video</Label>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted">
                  {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingVideo ? "Uploading..." : "Choose video"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
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
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Resource Name</Label>
                <Input
                  placeholder="e.g. Policy Handbook PDF"
                  value={moduleForm.resource_name}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, resource_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Resource URL</Label>
                <Input
                  placeholder="https://..."
                  value={moduleForm.resource_url}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, resource_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Upload Resource</Label>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted">
                  {uploadingResource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingResource ? "Uploading..." : "Choose PDF/PPT"}
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden"
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
                </label>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={moduleForm.duration_minutes}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, duration_minutes: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>
            </div>

            {/* Module Assessment Toggle */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-medium">Module Assessment</h4>
                      <p className="text-sm text-muted-foreground">Require learners to pass a short quiz before completing this module.</p>
                    </div>
                    <Switch
                      checked={includeModuleAssessment}
                      onCheckedChange={(checked) => {
                        setIncludeModuleAssessment(checked);
                        if (checked && moduleQuestions.length === 0) {
                          setModuleQuestions([makeQuestion()]);
                        }
                      }}
                    />
                  </div>

                  {includeModuleAssessment && (
                    <div className="mt-6 border-t border-border pt-6">
                      <QuestionBuilder
                        questions={moduleQuestions}
                        setQuestions={setModuleQuestions}
                        updateQuestion={updateModuleQuestion}
                        updateOption={updateModuleOption}
                        removeOption={removeModuleOption}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            {modules.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setIncludeModuleAssessment(false);
                  setModuleQuestions([]);
                  setAddingModule(false);
                }}
              >
                Cancel
              </Button>
            )}
            <Button onClick={handleSaveModule} disabled={!moduleForm.title.trim()}>Save Module</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepAssessment({
  includeAssessment,
  setIncludeAssessment,
  questions,
  setQuestions,
  updateQuestion,
  updateOption,
  removeOption,
}: {
  includeAssessment: boolean;
  setIncludeAssessment: React.Dispatch<React.SetStateAction<boolean>>;
  questions: QuestionDraft[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>;
  updateQuestion: (id: string, updates: Partial<QuestionDraft>) => void;
  updateOption: (question: QuestionDraft, index: number, value: string) => void;
  removeOption: (question: QuestionDraft, index: number) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold">Assessment</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add an optional quiz to verify understanding at the end of the course.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-medium">Include Assessment</h4>
                <p className="text-sm text-muted-foreground">Require learners to pass a quiz to complete this course.</p>
              </div>
              <Switch checked={includeAssessment} onCheckedChange={setIncludeAssessment} />
            </div>

            {includeAssessment && (
              <div className="mt-6 border-t border-border pt-6">
                <QuestionBuilder
                  questions={questions}
                  setQuestions={setQuestions}
                  updateQuestion={updateQuestion}
                  updateOption={updateOption}
                  removeOption={removeOption}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionBuilder({
  questions,
  setQuestions,
  updateQuestion,
  updateOption,
  removeOption,
}: {
  questions: QuestionDraft[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>;
  updateQuestion: (id: string, updates: Partial<QuestionDraft>) => void;
  updateOption: (question: QuestionDraft, index: number, value: string) => void;
  removeOption: (question: QuestionDraft, index: number) => void;
}) {
  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex items-center justify-between gap-3">
        <Label className="mb-0">Questions <span className="font-normal text-muted-foreground">({questions.length})</span></Label>
        <Button variant="outline" size="sm" onClick={() => setQuestions((prev) => [...prev, makeQuestion()])} className="gap-2">
          <Plus className="h-3.5 w-3.5" /> Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">No questions yet.</p>
          <button type="button" onClick={() => setQuestions((prev) => [...prev, makeQuestion()])} className="mt-1 text-sm font-medium text-primary hover:underline">
            Add your first question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <div key={question.id} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {questionIndex + 1}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
                  <Input
                    placeholder="Type your question..."
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={question.points}
                    onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value, 10) || 1 })}
                    aria-label="Question marks"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== question.id))}
                  className="mt-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 pl-0 sm:pl-9">
                <p className="text-xs font-medium text-muted-foreground">Select the correct answer</p>
                {question.options.map((option, optionIndex) => {
                  const isCorrect = question.correct_answer === option && option.trim() !== "";
                  return (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(question.id, { correct_answer: option })}
                        disabled={!option.trim()}
                        className={cn(
                          "shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          isCorrect ? "text-success" : "text-muted-foreground hover:text-foreground",
                        )}
                        aria-label="Mark as correct answer"
                      >
                        {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <Input
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(question, optionIndex, e.target.value)}
                        className={isCorrect ? "border-success/50 bg-success/5" : ""}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(question, optionIndex)}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Remove option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {question.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => updateQuestion(question.id, { options: [...question.options, ""] })}
                    className="flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepReview({
  courseForm,
  modules,
  includeAssessment,
  assessmentForm,
  questions,
  totalMarks,
  passMarks,
}: {
  courseForm: CourseForm;
  modules: ModuleDraft[];
  includeAssessment: boolean;
  assessmentForm: { title: string; description: string; passing_score: number; time_limit_minutes: number };
  questions: QuestionDraft[];
  totalMarks: number;
  passMarks: number;
}) {
  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-semibold">Ready to publish?</h3>
        <p className="mt-2 text-muted-foreground">Review your course details below before creating it.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/20 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{courseForm.category}</span>
            {courseForm.is_mandatory && (
              <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" /> Mandatory
              </span>
            )}
          </div>
          <h4 className="mt-3 text-xl font-bold">{courseForm.title || "Untitled Course"}</h4>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{courseForm.description || "No description provided."}</p>
          <div className="mt-5 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {courseForm.duration_hours} hours</span>
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {modules.length || courseForm.modules_count} modules</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 p-5 md:grid-cols-2 sm:p-6">
          <div>
            <h5 className="mb-4 text-sm font-semibold uppercase tracking-wider">Modules Included</h5>
            {modules.length > 0 ? (
              <ul className="space-y-3">
                {modules.map((module, index) => (
                  <li key={`${module.title}-${index}`} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{module.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{module.duration_minutes} mins</span>
                        {module.assessment && (
                          <span className="text-primary font-medium">
                            • Quiz ({module.assessment.questions?.length || 0} questions)
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">No modules added.</p>
            )}
          </div>

          <div>
            <h5 className="mb-4 text-sm font-semibold uppercase tracking-wider">Assessment</h5>
            {includeAssessment ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="font-medium">{assessmentForm.title || "Final Assessment"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Pass: {assessmentForm.passing_score}%</span>
                  <span>{passMarks} / {totalMarks} marks</span>
                  <span>{assessmentForm.time_limit_minutes === 0 ? "Unlimited" : `${assessmentForm.time_limit_minutes} mins`}</span>
                  <span>{questions.length} question{questions.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">No assessment included.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
