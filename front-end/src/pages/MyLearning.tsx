import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, CheckCircle2, PlayCircle, Download, Loader2, Eye } from "lucide-react";
import { useEnrollments, useCertifications } from "@/hooks/useData";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/integrations/api/client";
import { CertificatePreviewDialog } from "@/components/certificate/CertificatePreviewDialog";

const cleanCertTitle = (value: string) => String(value || "").replace(/\s+quiz\s*$/i, "").trim();

const formatCertDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const MyLearning = () => {
  const { data: enrollments, isLoading: enrollLoading } = useEnrollments();
  const { data: certifications, isLoading: certLoading } = useCertifications();
  const { user } = useAuth();
  const [previewCert, setPreviewCert] = useState<{
    courseTitle: string;
    issuedDate: string;
    certId: string;
  } | null>(null);

  const inProgress = (enrollments || []).filter((e) => e.status !== "completed");
  const completed = (enrollments || []).filter((e) => e.status === "completed");
  const certs = certifications || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">My Learning</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-display font-bold">{inProgress.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-display font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-secondary/10 text-secondary-foreground"><Award className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-display font-bold">{certs.length}</p>
              <p className="text-xs text-muted-foreground">Certificates</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {enrollLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <Tabs defaultValue="in-progress">
          <TabsList>
            <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="certificates">Certificates ({certs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="space-y-3 mt-4">
            {inProgress.length > 0 ? inProgress.map((enrollment, i) => {
              const course = (enrollment as any).courses;
              return (
                <motion.div key={enrollment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">{course?.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{course?.category}</span>
                            <span>• {course?.duration_hours}h</span>
                            <span>• {course?.modules_count} modules</span>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span className="font-medium">{enrollment.progress}%</span>
                            </div>
                            <Progress value={Number(enrollment.progress)} className="h-2" />
                          </div>
                        </div>
                        <Link to={`/courses/${enrollment.course_id}`}>
                          <Button size="sm" className="gap-2 shrink-0"><PlayCircle className="h-4 w-4" /> Continue</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No courses in progress. <Link to="/courses" className="text-primary hover:underline">Browse courses</Link></p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {completed.map((enrollment) => {
              const course = (enrollment as any).courses;
              return (
                <Card key={enrollment.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-display font-semibold">{course?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Score: {enrollment.score ?? "N/A"}% • Completed {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Link to={`/courses/${enrollment.course_id}`}>
                      <Badge variant="secondary" className="bg-success/10 text-success cursor-pointer">Review</Badge>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
            {completed.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">No completed courses yet.</p>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-3 mt-4">
            {certs.map((cert, i) => (
              <motion.div key={cert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-lg p-2.5 bg-secondary/20"><Award className="h-5 w-5 text-secondary-foreground" /></div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold">{cleanCertTitle(cert.title)}</h3>
                      <p className="text-xs text-muted-foreground">
                        Issued: {new Date(cert.issued_at).toLocaleDateString()} {cert.issuer && `• ${cert.issuer}`}
                        {(cert as any).courses?.title && ` • ${(cert as any).courses.title}`}
                        {(cert as any).expires_at && ` • Valid until ${new Date((cert as any).expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          setPreviewCert({
                            courseTitle: cleanCertTitle(
                              cert.title || (cert as any).courses?.title || "Course Completion",
                            ),
                            issuedDate: formatCertDate(cert.issued_at),
                            certId: String((cert as any).certificate_no || cert.id).toUpperCase(),
                          })
                        }
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <CertDownloadBtn certId={cert.id} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {certs.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">No certificates earned yet.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {previewCert && (
        <CertificatePreviewDialog
          open={!!previewCert}
          onOpenChange={(open) => !open && setPreviewCert(null)}
          userName={user?.full_name || user?.user_metadata?.full_name || "Certificate Holder"}
          courseTitle={previewCert.courseTitle}
          issuedDate={previewCert.issuedDate}
          certId={previewCert.certId}
        />
      )}
    </div>
  );
};

const CertDownloadBtn = ({ certId }: { certId: number | string }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (!token) throw new Error("Not authenticated");

      const idStr = String(certId);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(`${API_URL}/api/certificates/${idStr}/generate`, {
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

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-${idStr.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        window.clearTimeout(timeoutId);
      }
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
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Generating..." : "Download"}
    </Button>
  );
};

export default MyLearning;
