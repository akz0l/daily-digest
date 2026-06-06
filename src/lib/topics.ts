/**
 * Mantener sincronizado con ALLOWED_TOPICS en cada Lambda (generateOtp, validateOtp, generateDigest, sendDigestEmail).
 */
export const TOPICS = [
  "Cloud",
  "IA",
  "Ciberseguridad",
  "Development",
] as const;

export type Topic = (typeof TOPICS)[number];
