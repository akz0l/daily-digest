export const TOPICS = [
  "Cloud",
  "IA",
  "Ciberseguridad",
  "Development",
] as const;

export type Topic = (typeof TOPICS)[number];
