export const LOCATIONS = [
  "Mogadishu-HQ",
  "Jowhar",
  "Baidoa",
  "Dhusamareb",
  "Garowe",
  "Kismayo",
] as const;

export type Location = (typeof LOCATIONS)[number];
