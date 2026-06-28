export const JOB_TITLES = [
  "Governor",
  "Deputy Governor",
  "Executive Director",
  "Director",
  "General Manager",
  "Head",
  "Senior Officer",
  "Officer",
  "Assistant",
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];
