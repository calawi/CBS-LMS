import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, Clock, RotateCcw, ChevronRight, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_URL } from "@/integrations/api/client";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  order_index: number;
  points: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  course_id: string;
  module_id?: number | string | null;
}

interface PastResult {
  id: string;
  score: number;
  passed: boolean;
  completed_at: string;
  answers: Record<string, string> | null;
}

interface CourseQuizProps {
  assessment: Assessment;
  questions: Question[];
  pastResults: PastResult[];
  enrollmentId: string;
  onBackToCourse?: () => void;
}

const downloadPdf = async (url: string, token: string, filename: string) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      const message = contentType.includes("application/json")
        ? (await res.json())?.error
        : await res.text();
      throw new Error(message || "Failed to generate certificate");
    }

    const blob = await res.blob();
    if (!blob.size) throw new Error("The certificate PDF was empty");

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const CourseQuiz = ({ assessment, questions, pastResults, enrollmentId, onBackToCourse }: CourseQuizProps) => {
  const [stage, setStage] = useState<"intro" | "quiz" | "results">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isModuleQuiz = assessment.module_id !== null && assessment.module_id !== undefined;

  const totalPoints = useMemo(() => questions.reduce((s, q) => s + q.points, 0), [questions]);
  const bestScore = useMemo(() => {
    if (pastResults.length === 0) return null;
    return Math.max(...pastResults.map((r) => Number(r.score)));
  }, [pastResults]);

  const hasPassedBefore = useMemo(
    () => pastResults.some((r) => Boolean(r.passed) || Number(r.score) >= assessment.passing_score),
    [pastResults, assessment.passing_score],
  );

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    let earned = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) earned += q.points;
    });
    const pct = Math.round((earned / totalPoints) * 100);
    const didPass = pct >= assessment.passing_score;

    setScore(pct);
    setPassed(didPass);
    setStage("results");

    try {
      if (!token) throw new Error("Not authenticated");

      await apiFetch("/api/lms/assessment-results", {
        method: "POST",
        token,
        body: {
          assessment_id: assessment.id,
          enrollment_id: enrollmentId,
          score: pct,
          passed: didPass,
          answers: answers as any,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["assessment_results"] });
      queryClient.invalidateQueries({ queryKey: ["all_assessment_results"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
    } catch (error: any) {
      toast({ title: "Error saving results", description: error.message, variant: "destructive" });
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentQ(0);
    setStage("quiz");
  };

  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  // INTRO SCREEN
  if (stage === "intro") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Award className="h-7 w-7 text-primary" />
              </div>
            </div>
            <CardTitle className="font-display text-xl">{assessment.title}</CardTitle>
            <CardDescription>{assessment.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> {questions.length} questions
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Pass: {assessment.passing_score}%
              </span>
              {assessment.time_limit_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {assessment.time_limit_minutes} min
                </span>
              )}
            </div>

            {bestScore !== null && (
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Best score so far</p>
                <p className={cn("text-lg font-bold", bestScore >= assessment.passing_score ? "text-success" : "text-destructive")}>
                  {bestScore}%
                </p>
              </div>
            )}

            {pastResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Previous attempts</p>
                {pastResults.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">{new Date(r.completed_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.score}%</span>
                      {r.passed ? (
                        <Badge className="bg-success/10 text-success border-0 text-xs">Passed</Badge>
                      ) : (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Failed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 pt-2">
              {hasPassedBefore ? (
                <>
                  <div className="flex items-center gap-2 text-success font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    {isModuleQuiz ? "Quiz passed" : "Assessment passed — retakes are not allowed"}
                  </div>
                  {!isModuleQuiz && <DownloadCertificateButton courseId={assessment.course_id} userId={user!.id} />}
                </>
              ) : (
                <Button size="lg" className="gap-2" onClick={() => { setAnswers({}); setCurrentQ(0); setStage("quiz"); }}>
                  {pastResults.length > 0 ? <RotateCcw className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {pastResults.length > 0 ? "Retake Assessment" : "Start Assessment"}
                </Button>
              )}
              {onBackToCourse && (
                <Button variant="outline" onClick={onBackToCourse}>
                  Back to Course
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // RESULTS SCREEN
  if (stage === "results") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className={cn("border-2", passed ? "border-success/30" : "border-destructive/30")}>
          <CardContent className="p-8 text-center space-y-4">
            <div className={cn("flex h-20 w-20 items-center justify-center rounded-full mx-auto", passed ? "bg-success/10" : "bg-destructive/10")}>
              {passed ? <Award className="h-10 w-10 text-success" /> : <XCircle className="h-10 w-10 text-destructive" />}
            </div>
            <h2 className="font-display text-2xl font-bold">
              {passed ? "Congratulations! 🎉" : "Not quite there yet"}
            </h2>
            <p className="text-muted-foreground">
              {passed
                ? "You've passed the assessment and demonstrated your knowledge."
                : `You need ${assessment.passing_score}% to pass. Review the material and try again.`}
            </p>
            <div className="text-4xl font-display font-bold">
              <span className={passed ? "text-success" : "text-destructive"}>{score}%</span>
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto pt-4">
              {questions.map((q) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correct_answer;
                return (
                  <div key={q.id} className={cn("p-3 rounded-lg text-sm", isCorrect ? "bg-success/5" : "bg-destructive/5")}>
                    <div className="flex items-start gap-2">
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                      <div>
                        <p className="font-medium">{q.question}</p>
                        {!isCorrect && (
                          <>
                            <p className="text-destructive text-xs mt-1">Your answer: {userAnswer || "No answer"}</p>
                            <p className="text-success text-xs">Correct: {q.correct_answer}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-3 pt-4">
              {passed && !isModuleQuiz && (
                <DownloadCertificateButton courseId={assessment.course_id} userId={user!.id} />
              )}
              {!passed && (
                <Button onClick={handleRetake} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Retake
                </Button>
              )}
              <Button variant="outline" onClick={() => (onBackToCourse ? onBackToCourse() : setStage("intro"))}>
                Back to Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // QUIZ SCREEN
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Question {currentQ + 1} of {questions.length}</p>
            <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="font-display font-semibold text-lg mb-4">{q.question}</h3>
              <div className="space-y-2.5">
                {(q.options as string[]).map((opt) => {
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(q.id, opt)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-lg border-2 transition-all text-sm",
                        isSelected
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="outline" size="sm" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
              Previous
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentQ(currentQ + 1)} disabled={!answers[q.id]}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmitQuiz} disabled={answeredCount < questions.length} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Submit Assessment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const DownloadCertificateButton = ({ courseId }: { courseId: string; userId?: string }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (!token) throw new Error("Not authenticated");

      // Find the certification for this course from the user's certifications list.
      const res = await apiFetch<any>("/api/lms/certifications/me", { token });
      const certifications = res?.data ?? res ?? [];
      const cert = (certifications || []).find((c: any) => String(c.course_id) === String(courseId));

      const certIdStr = String(cert?.id || courseId);
      await downloadPdf(
        cert?.id
          ? `${API_URL}/api/certificates/${cert.id}/generate`
          : `${API_URL}/api/certificates/course/${courseId}/generate`,
        token,
        `certificate-${certIdStr.slice(0, 8)}.pdf`,
      );
    } catch (error: any) {
      const msg = error.name === "AbortError"
        ? "Certificate generation timed out. Please confirm the backend is running and try again."
        : error.message?.includes("Failed to fetch")
        ? "Cannot reach the server. Start the backend (npm run restart in back-end folder)."
        : error.message;
      toast({ title: "Download failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Generating..." : "Download Certificate"}
    </Button>
  );
};

export default CourseQuiz;
