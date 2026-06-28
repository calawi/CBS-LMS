import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, BookOpen, Play, PlayCircle, CheckCircle2, Pencil } from "lucide-react";
import { useCourses, useEnrollments, useEnrollInCourse } from "@/hooks/useData";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasAnyRole } from "@/lib/roles";
import { getProgramByCategory, getProgramBySlug, matchesProgramCategory, normalizeCourseCategory, TRAINING_PROGRAM_CATEGORY_NAMES } from "@/lib/courseCategories";
import { resolveMediaUrl } from "@/integrations/api/client";

const levelColors: Record<string, string> = {
  Beginner: "bg-info/10 text-info",
  Intermediate: "bg-warning/10 text-warning",
  Advanced: "bg-accent/10 text-accent",
};

const Courses = () => {
  const { programSlug } = useParams<{ programSlug?: string }>();
  const program = getProgramBySlug(programSlug);
  const lockedCategory = program?.category ?? null;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(lockedCategory || "All");
  const { data: courses, isLoading } = useCourses();
  const { data: enrollments } = useEnrollments();
  const enrollMutation = useEnrollInCourse();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canCreateCourse = hasAnyRole(user?.roles, ["sysadmin", "instructor"]);
  const isSysadmin = hasAnyRole(user?.roles, ["sysadmin"]);
  const isInstructor = hasAnyRole(user?.roles, ["instructor"]);
  const canEnrollInCourses = hasAnyRole(user?.roles, ["learner"]);

  const enrollmentByCourseId = new Map((enrollments || []).map((e) => [String(e.course_id), e]));

  const filterCategories = lockedCategory
    ? [lockedCategory]
    : ["All", ...TRAINING_PROGRAM_CATEGORY_NAMES];

  const filtered = (courses || []).filter((c) => {
    const isPublished = !c.status || c.status === "Published";
    if (!canCreateCourse && !isPublished) return false;
    const courseCategory = normalizeCourseCategory(c.category);
    const selectedCategory = normalizeCourseCategory(category);
    const matchesCategory =
      lockedCategory ||
      category === "All" ||
      courseCategory === selectedCategory ||
      getProgramByCategory(c.category)?.category === category;
    const matchesProgram = lockedCategory
      ? matchesProgramCategory(c.category, programSlug || "")
      : true;
    return (
      matchesCategory &&
      matchesProgram &&
      c.title.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleEnroll = async (e: React.MouseEvent, courseId: string, title: string) => {
    e.stopPropagation();
    try {
      await enrollMutation.mutateAsync(courseId);
      toast({ title: "Enrolled!", description: `You've enrolled in ${title}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Enrollment failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const pageTitle = program
    ? `${program.letter}. ${t(program.labelKey)}`
    : t("courses.title");
  const pageSubtitle = program
    ? t(program.descriptionKey)
    : `${courses?.length || 0} ${t("courses.available")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        {canCreateCourse && (
          <Button className="gap-2" onClick={() => navigate("/admin")}>
            <BookOpen className="h-4 w-4" /> Create Course
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!lockedCategory && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterCategories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat)}
                className="shrink-0"
              >
                {cat === "All" ? "All" : cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No courses in this program yet.</p>
            <p className="text-xs mt-1">Ask your instructor or HR to publish courses for this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((course, i) => {
            const enrollment = enrollmentByCourseId.get(String(course.id));
            const isEnrolled = !!enrollment;
            const isCompleted = enrollment?.status === "completed";
            const hasOwner = course.created_by_user_id !== null && course.created_by_user_id !== undefined && course.created_by_user_id !== "";
            const ownerId = Number(course.created_by_user_id);
            const canEditThisCourse =
              isSysadmin ||
              (isInstructor && (!hasOwner || ownerId === Number(user?.id)));
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="group hover:shadow-lg transition-all cursor-pointer h-full flex flex-col"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={resolveMediaUrl(course.thumbnail_url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-primary/30" />
                    )}
                    <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-8 w-8 text-primary-foreground" />
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {course.is_mandatory ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                          Mandatory
                        </span>
                      ) : course.level ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.level] || "bg-muted text-muted-foreground"}`}
                        >
                          {course.level}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{course.category}</span>
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 flex-1">{course.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {course.modules_count} modules
                      </span>
                    </div>
                    {canEnrollInCourses && (
                      <div className="mt-3">
                        {isCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 text-success border-success/30 bg-success/5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}`);
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </Button>
                        ) : isEnrolled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 text-primary border-primary/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}`);
                          }}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Continue Learning
                        </Button>
                        ) : (
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={(e) => handleEnroll(e, course.id, course.title)}
                          disabled={enrollMutation.isPending}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Enroll
                        </Button>
                        )}
                      </div>
                    )}
                    {canEditThisCourse && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin?editCourseId=${course.id}`);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit Course
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Courses;
