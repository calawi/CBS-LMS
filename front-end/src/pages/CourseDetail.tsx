import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle2, PlayCircle, Lock, Award, FileQuestion, FileText, Star, Download,
} from "lucide-react";
import {
  useCourseById,
  useCourseModules,
  useEnrollmentForCourse,
  useEnrollInCourse,
  useUpdateProgress,
  useAssessmentForCourse,
  useAssessmentQuestions,
  useAssessmentResults,
  useAllAssessmentResults,
  useCourseRatingSummary,
  useMyCourseRating,
  useSubmitCourseRating,
} from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import CourseQuiz from "@/components/CourseQuiz";
import { Textarea } from "@/components/ui/textarea";
import { resolveMediaUrl } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyRole } from "@/lib/roles";

/** Inverse of progress % saved when marking modules complete (Math.round(completed / total * 100)). */
function getCompletedModuleCount(progress: number, totalModules: number): number {
  if (totalModules <= 0) return 0;
  return Math.min(totalModules, Math.round((progress / 100) * totalModules));
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: course, isLoading: courseLoading } = useCourseById(courseId);
  const { data: modules, isLoading: modulesLoading } = useCourseModules(courseId);
  const { data: enrollment } = useEnrollmentForCourse(courseId);
  const enrollMutation = useEnrollInCourse();
  const updateProgress = useUpdateProgress();
  const { data: assessment } = useAssessmentForCourse(courseId);
  const { data: assessmentQuestions } = useAssessmentQuestions(assessment?.id);
  const { data: assessmentResults } = useAssessmentResults(assessment?.id);
  const { data: ratingSummary } = useCourseRatingSummary(courseId);
  const { data: myRating } = useMyCourseRating(courseId);
  const ratingMutation = useSubmitCourseRating(courseId);
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEnrollInCourses = hasAnyRole(user?.roles, ["learner"]);
  const [activeModule, setActiveModule] = useState<number>(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeModuleQuiz, setActiveModuleQuiz] = useState<any | null>(null);
  const [ratingPick, setRatingPick] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [completedVideoModules, setCompletedVideoModules] = useState<Set<string>>(new Set());
  const [hasResumedProgress, setHasResumedProgress] = useState(false);
  const { data: allResults } = useAllAssessmentResults();

  useEffect(() => {
    if (myRating && typeof (myRating as any).comment === "string") {
      setRatingComment((myRating as any).comment);
    }
  }, [myRating]);

  useEffect(() => {
    setVideoError(false);
  }, [activeModule, courseId]);

  useEffect(() => {
    setHasResumedProgress(false);
  }, [courseId]);

  const isEnrolled = !!enrollment;
  const totalModules = modules?.length || 0;
  const progress = Number(enrollment?.progress || 0);
  const completedModules = getCompletedModuleCount(progress, totalModules);

  // Restore video-watched state for modules already completed in enrollment progress.
  useEffect(() => {
    if (!isEnrolled || !modules?.length) return;
    const completed = getCompletedModuleCount(progress, totalModules);
    const watched = new Set<string>();
    for (let i = 0; i < completed; i++) {
      const mod = modules[i];
      if (mod?.id) watched.add(String(mod.id));
    }
    setCompletedVideoModules(watched);
  }, [isEnrolled, modules, progress, totalModules, courseId]);

  // Resume on the first incomplete module when returning to the course.
  useEffect(() => {
    if (hasResumedProgress || !isEnrolled || !totalModules || enrollment === undefined) return;
    const completed = getCompletedModuleCount(progress, totalModules);
    setActiveModule(completed < totalModules ? completed : Math.max(0, totalModules - 1));
    setHasResumedProgress(true);
  }, [hasResumedProgress, isEnrolled, totalModules, enrollment, progress]);

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      await enrollMutation.mutateAsync(courseId);
      toast({ title: "Enrolled!", description: `You've enrolled in ${course?.title}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCompleteModule = async (moduleIndex: number) => {
    if (!enrollment || !totalModules) return;
    const newCompleted = Math.min(moduleIndex + 1, totalModules);
    const newProgress = Math.round((newCompleted / totalModules) * 100);
    try {
      await updateProgress.mutateAsync({
        enrollmentId: enrollment.id,
        progress: newProgress,
      });
      if (moduleIndex + 1 < totalModules) {
        setActiveModule(moduleIndex + 1);
        setShowQuiz(false);
        setActiveModuleQuiz(null);
      } else if (assessment) {
        setShowQuiz(true);
        setActiveModuleQuiz(null);
        toast({
          title: "Module complete",
          description: assessmentQuestions?.length
            ? "Take the final assessment when you're ready."
            : "All modules are done. The final assessment is not available yet — contact your instructor.",
        });
      }
      if (newProgress >= 100 && !assessment) {
        toast({ title: "Course completed!", description: "Congratulations on completing this course!" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openFinalAssessment = () => {
    if (progress < 100) {
      toast({
        title: "Complete modules first",
        description: "Finish all modules before taking the final assessment.",
        variant: "destructive",
      });
      return;
    }
    if (!assessment) return;
    if (!assessmentQuestions?.length) {
      toast({
        title: "Assessment not ready",
        description: "This course has no quiz questions yet. Ask your instructor to add them.",
        variant: "destructive",
      });
      return;
    }
    setShowQuiz(true);
  };

  const allModulesComplete = progress >= 100 || completedModules >= totalModules;
  const currentModule = modules?.[activeModule];
  const currentModuleId = currentModule?.id ? String(currentModule.id) : "";
  const currentModuleHasVideo = Boolean((currentModule as any)?.video_url);
  const isCurrentModuleAlreadyComplete = isEnrolled && activeModule < completedModules;
  const currentVideoCompleted =
    isCurrentModuleAlreadyComplete || !currentModuleHasVideo || completedVideoModules.has(currentModuleId);
  const hasPassedModuleQuiz = currentModule?.assessment
    ? (allResults || []).some((r: any) => Number(r.assessment_id) === Number(currentModule.assessment.id) && r.passed)
    : true;

  if (courseLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;
  }

  if (!course) {
    return <div className="text-center py-20 text-muted-foreground">Course not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{course.category}</Badge>
            {course.level && <Badge variant="outline" className="text-xs">{course.level}</Badge>}
            {course.is_mandatory && <Badge className="bg-destructive/10 text-destructive text-xs border-0">Mandatory</Badge>}
            {course.is_prerequisite_for_overseas && <Badge className="bg-warning/10 text-warning text-xs border-0">Overseas Prerequisite</Badge>}
          </div>
          <h1 className="text-2xl font-display font-bold">{course.title}</h1>
          <p className="text-muted-foreground mt-1">{course.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration_hours}h</span>
            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {course.modules_count} modules</span>
          </div>
        </div>
        <div className="shrink-0">
          {!isEnrolled && canEnrollInCourses ? (
            <Button size="lg" className="gap-2" onClick={handleEnroll} disabled={enrollMutation.isPending}>
              <PlayCircle className="h-5 w-5" />
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </Button>
          ) : enrollment?.status === "completed" ? (
            <Badge className="bg-success/10 text-success text-sm px-4 py-2 border-0 gap-1">
              <Award className="h-4 w-4" /> Completed
            </Badge>
          ) : (
            <div className="text-right">
              <p className="text-sm font-medium">{progress}% Complete</p>
              <Progress value={progress} className="h-2 w-32 mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for enrolled */}
      {isEnrolled && enrollment?.status !== "completed" && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Course Progress</p>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedModules} of {totalModules} modules completed
            </p>
            {progress >= 100 && assessment && enrollment?.status !== "completed" && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                All modules done — pass the final assessment to complete this course.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rating & feedback (enrolled or completed) */}
      {isEnrolled && courseId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("courseDetail.ratingTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("courseDetail.ratingAvg")}{" "}
              {ratingSummary && Number(ratingSummary.count) > 0
                ? `${Number(ratingSummary.avg_rating).toFixed(1)} / 5 (${ratingSummary.count})`
                : "—"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{t("courseDetail.yourRating")}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingPick(n)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors flex items-center gap-1",
                      (ratingPick ?? myRating?.rating) === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Star className={cn("h-4 w-4", n <= (ratingPick ?? myRating?.rating ?? 0) ? "fill-warning text-warning" : "text-muted-foreground")} />
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("courseDetail.feedback")}</label>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={t("courseDetail.feedbackPlaceholder")}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={ratingMutation.isPending || !(ratingPick ?? myRating?.rating)}
              onClick={async () => {
                const r = ratingPick ?? myRating?.rating;
                if (!r) return;
                try {
                  await ratingMutation.mutateAsync({
                    rating: r,
                    comment: ratingComment.trim() || null,
                  });
                  toast({ title: t("courseDetail.ratingSaved") });
                  setRatingPick(null);
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
            >
              {ratingMutation.isPending ? "…" : t("courseDetail.submitRating")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Module list + content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Modules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {modulesLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {modules?.map((mod, i) => {
                    const isCompleted = isEnrolled && i < completedModules;
                    const isLocked = !isEnrolled || i > completedModules;
                    const isActive = activeModule === i;
                    return (
                      <button
                        key={mod.id}
                        onClick={() => !isLocked && (setActiveModule(i), setActiveModuleQuiz(null), setShowQuiz(false))}
                        disabled={isLocked}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                          isActive && "bg-primary/5",
                          !isLocked && "hover:bg-muted/50",
                          isLocked && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <span className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", isCompleted && "text-muted-foreground line-through")}>
                            {mod.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{mod.duration_minutes} min</p>
                        </div>
                      </button>
                    );
                  })}
                  {/* Assessment entry in sidebar */}
                  {assessment && isEnrolled && (
                    <button
                      onClick={openFinalAssessment}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-t border-border",
                        showQuiz ? "bg-primary/5" : "hover:bg-muted/50",
                        progress < 100 && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={progress < 100}
                    >
                      <FileQuestion className={cn("h-5 w-5", showQuiz ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Final Assessment</p>
                        <p className="text-xs text-muted-foreground">
                          {progress < 100 ? "Complete all modules first" : "Take the quiz"}
                        </p>
                      </div>
                      {(assessmentResults || []).some((r) => r.passed) && (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      )}
                    </button>
                  )}
                  {(!modules || modules.length === 0) && (
                    <p className="p-4 text-sm text-muted-foreground text-center">No modules yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Module content viewer */}
        <div className="lg:col-span-2">
          {!isEnrolled ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-display font-semibold text-lg mb-2">
                  {canEnrollInCourses ? "Enroll to Start Learning" : "Course preview"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {canEnrollInCourses
                    ? `Enroll in this course to access all ${totalModules} modules and track your progress.`
                    : "Enrollment is available for learner accounts only."}
                </p>
                {canEnrollInCourses && (
                  <Button size="lg" className="gap-2" onClick={handleEnroll} disabled={enrollMutation.isPending}>
                    <PlayCircle className="h-5 w-5" /> Enroll Now
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : showQuiz && assessment && assessmentQuestions && assessmentQuestions.length > 0 ? (
            <CourseQuiz
              assessment={assessment}
              questions={assessmentQuestions.map((q) => ({ ...q, options: (Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)) as string[] }))}
              pastResults={(assessmentResults || []).map((r) => ({ ...r, answers: r.answers as Record<string, string> | null }))}
              enrollmentId={enrollment!.id}
              onBackToCourse={() => setShowQuiz(false)}
            />
          ) : showQuiz && assessment ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="font-display font-semibold text-lg mb-2">Final assessment not ready</h3>
                <p className="text-sm text-muted-foreground">
                  This course has no quiz questions yet. Please contact your instructor.
                </p>
              </CardContent>
            </Card>
          ) : activeModuleQuiz ? (
            <CourseQuiz
              assessment={activeModuleQuiz}
              questions={(activeModuleQuiz.questions || []).map((q: any) => ({
                ...q,
                options: (Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)) as string[]
              }))}
              pastResults={(allResults || [])
                .filter((r: any) => Number(r.assessment_id) === Number(activeModuleQuiz.id))
                .map((r: any) => ({ ...r, answers: r.answers as Record<string, string> | null }))}
              enrollmentId={enrollment!.id}
              onBackToCourse={() => setActiveModuleQuiz(null)}
            />
          ) : currentModule ? (
            <motion.div key={currentModule.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Module {activeModule + 1} of {totalModules}</p>
                      <CardTitle className="font-display">{currentModule.title}</CardTitle>
                    </div>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">
                      {currentModule.duration_minutes} min
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(currentModule as any)?.video_url ? (
                    <div className="space-y-3">
                      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                        {videoError ? (
                          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
                            <p>Video could not be loaded.</p>
                            <a
                              href={resolveMediaUrl((currentModule as any).video_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              Open video in a new tab
                            </a>
                          </div>
                        ) : (
                          <video
                            key={resolveMediaUrl((currentModule as any).video_url)}
                            src={resolveMediaUrl((currentModule as any).video_url)}
                            controls
                            playsInline
                            className="h-full w-full"
                            preload="metadata"
                            onError={() => setVideoError(true)}
                            onLoadedData={() => setVideoError(false)}
                            onEnded={() => {
                              if (currentModuleId) {
                                setCompletedVideoModules((prev) => new Set(prev).add(currentModuleId));
                              }
                            }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentVideoCompleted
                          ? "Video complete. You can now mark this module complete."
                          : "Watch the full lesson video to unlock module completion."}
                      </p>
                    </div>
                  ) : null}

                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed">{currentModule.content}</p>
                  </div>

                  {(currentModule as any)?.resource_url ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <a
                        href={resolveMediaUrl((currentModule as any).resource_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{(currentModule as any).resource_name || "Attached file"}</span>
                      </a>
                      <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
                        <a
                          href={resolveMediaUrl((currentModule as any).resource_url)}
                          download={(currentModule as any).resource_name || true}
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </Button>
                    </div>
                  ) : null}

                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeModule === 0}
                      onClick={() => { setActiveModule(Math.max(0, activeModule - 1)); setShowQuiz(false); }}
                    >
                      Previous
                    </Button>
                    {allModulesComplete && assessment ? (
                      <Button size="sm" className="gap-1.5" onClick={openFinalAssessment}>
                        <FileQuestion className="h-4 w-4" />
                        Take Final Assessment
                      </Button>
                    ) : activeModule < completedModules ? (
                      <Button
                        size="sm"
                        onClick={() => setActiveModule(Math.min(totalModules - 1, activeModule + 1))}
                        disabled={activeModule >= totalModules - 1}
                      >
                        Next Module
                      </Button>
                    ) : currentModule?.assessment && !hasPassedModuleQuiz ? (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setActiveModuleQuiz(currentModule.assessment)}
                        disabled={!currentVideoCompleted}
                      >
                        <FileQuestion className="h-4 w-4" />
                        Take Module Quiz
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleCompleteModule(activeModule)}
                        disabled={updateProgress.isPending || !currentVideoCompleted}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {updateProgress.isPending
                          ? "Saving..."
                          : !currentVideoCompleted
                            ? "Watch video first"
                          : activeModule === totalModules - 1
                            ? "Complete Course"
                            : "Mark Complete & Next"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Select a module to begin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
};

export default CourseDetail;
