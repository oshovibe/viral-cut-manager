// Valeurs "enum-like" centralisées (SQLite ne supporte pas les enums Prisma natifs).

export const PROJECT_TYPES = ["local-mpt", "remakeit", "local-full"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  "local-mpt": "Local — MoneyPrinterTurbo (génération from prompt)",
  remakeit: "Remakeit (production & publication déléguées, suivi ici)",
  "local-full": "Local — pipeline clipping complet (YouTube → shorts)",
};

export const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
};

// Machine à états du warm-up (cf. vendor/skills/tiktok-warmup, genfeed.ai, MIT).
export const WARMUP_STATES = [
  "new",
  "warming",
  "warmup_content",
  "assessment",
  "warmed",
  "extended",
  "suppressed",
] as const;
export type WarmupState = (typeof WARMUP_STATES)[number];

export const WARMUP_STATE_LABELS: Record<WarmupState, string> = {
  new: "Nouveau (rien fait)",
  warming: "Warm-up J1-J2 (engagement)",
  warmup_content: "Contenu warm-up J3 prêt",
  assessment: "En évaluation (J3 +48h)",
  warmed: "Réchauffé — prêt à publier",
  extended: "Warm-up prolongé (3 jours de plus)",
  suppressed: "Suspicion de suppression — à auditer",
};

// Seul cet état autorise l'auto-publish sans override.
export const PUBLISH_READY_STATE: WarmupState = "warmed";

export const ACCOUNT_HEALTH = ["healthy", "warning", "suspended"] as const;
export type AccountHealth = (typeof ACCOUNT_HEALTH)[number];

export const VIDEO_SOURCE_TYPES = ["youtube", "prompt", "upload"] as const;
export const VIDEO_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "published",
] as const;
export const PRODUCED_BY = [
  "local-mpt",
  "remakeit",
  "local-full",
  "manual",
] as const;

export const POST_STATUSES = ["scheduled", "published", "removed"] as const;

export const REVENUE_PROGRAMS = [
  "tiktok_creator_rewards",
  "youtube_shorts",
  "instagram_bonus",
  "brand_deal",
  "other",
] as const;
export type RevenueProgram = (typeof REVENUE_PROGRAMS)[number];

export const REVENUE_PROGRAM_LABELS: Record<RevenueProgram, string> = {
  tiktok_creator_rewards: "TikTok Creator Rewards",
  youtube_shorts: "YouTube Shorts (monétisation)",
  instagram_bonus: "Instagram Bonus / Reels Play",
  brand_deal: "Partenariat / brand deal",
  other: "Autre",
};

export const METRIC_SOURCES = ["manual", "upload-post", "monid"] as const;
