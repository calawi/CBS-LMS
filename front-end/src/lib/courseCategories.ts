import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Briefcase,
  Scale,
  Shield,
  ClipboardCheck,
} from "lucide-react";

/** Canonical BRD training program categories (stored in courses.category). */
export const TRAINING_PROGRAMS = [
  {
    slug: "onboarding",
    category: "Onboarding",
    letter: "A",
    labelKey: "nav.program.onboarding",
    descriptionKey: "programs.onboarding.desc",
    icon: Building2,
  },
  {
    slug: "hr-policy",
    category: "HR Policy Training",
    letter: "B",
    labelKey: "nav.program.hrPolicy",
    descriptionKey: "programs.hrPolicy.desc",
    icon: Briefcase,
  },
  {
    slug: "legal-regulatory",
    category: "Legal & Regulatory",
    letter: "C",
    labelKey: "nav.program.legalRegulatory",
    descriptionKey: "programs.legalRegulatory.desc",
    icon: Scale,
  },
  {
    slug: "code-of-conduct",
    category: "Code of Conduct",
    letter: "D",
    labelKey: "nav.program.codeOfConduct",
    descriptionKey: "programs.codeOfConduct.desc",
    icon: Shield,
  },
  {
    slug: "compliance",
    category: "Security Compliance",
    aliases: ["Compliance"],
    letter: "E",
    labelKey: "nav.program.compliance",
    descriptionKey: "programs.compliance.desc",
    icon: ClipboardCheck,
  },
] as const;

export type TrainingProgramSlug = (typeof TRAINING_PROGRAMS)[number]["slug"];

export const TRAINING_PROGRAM_CATEGORY_NAMES = TRAINING_PROGRAMS.map((p) => p.category);

export function normalizeCourseCategory(category: string | undefined) {
  return (category || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getProgramBySlug(slug: string | undefined) {
  return TRAINING_PROGRAMS.find((p) => p.slug === slug);
}

export function getProgramByCategory(category: string | undefined) {
  if (!category) return undefined;
  const norm = normalizeCourseCategory(category);
  return TRAINING_PROGRAMS.find(
    (p) =>
      normalizeCourseCategory(p.category) === norm ||
      ("aliases" in p && p.aliases.some((alias) => normalizeCourseCategory(alias) === norm)),
  );
}

export function matchesProgramCategory(courseCategory: string | undefined, programSlug: string) {
  const program = getProgramBySlug(programSlug);
  if (!program || !courseCategory) return false;
  const norm = normalizeCourseCategory(courseCategory);
  return (
    norm === normalizeCourseCategory(program.category) ||
    ("aliases" in program && program.aliases.some((alias) => normalizeCourseCategory(alias) === norm))
  );
}

/** Admin / instructor course editor dropdown */
export const ADMIN_COURSE_CATEGORIES = TRAINING_PROGRAM_CATEGORY_NAMES;
