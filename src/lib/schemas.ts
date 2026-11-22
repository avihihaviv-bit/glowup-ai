import { z } from "zod";

/* ---------- Shared pieces ---------- */

export const PhotoFeedback = z.object({
  usable: z.boolean().describe("false if the photo is too dark/blurry or doesn't show what is needed"),
  issue: z.string().describe("If not usable, what is wrong. Empty string otherwise."),
  lighting: z.string(),
  angle: z.string(),
  clarity: z.string(),
  tips: z.array(z.string()),
});

const Suggestion = z.object({
  name: z.string(),
  why: z.string(),
  howToAsk: z.string().describe("Exact wording to tell the barber/stylist"),
});

const ActionItem = z.object({
  title: z.string(),
  how: z.string(),
  minutes: z.number(),
});

/* ---------- Face ---------- */

export const FACE_SHAPES = ["oval", "round", "square", "rectangle", "heart", "diamond", "triangle"] as const;

export const FaceAnalysisSchema = z.object({
  photo: PhotoFeedback,
  faceShape: z.object({
    shape: z.enum(FACE_SHAPES),
    confidence: z.enum(["low", "medium", "high"]),
    explanation: z.string(),
  }),
  hairstyles: z.array(Suggestion),
  eyebrows: z.array(z.string()),
  grooming: z.array(z.string()),
  glasses: z.object({
    relevant: z.boolean(),
    recommendedFrames: z.array(z.string()),
    avoid: z.array(z.string()),
  }),
  style: z.array(z.string()),
  actionPlan: z.array(ActionItem),
});
export type FaceAnalysis = z.infer<typeof FaceAnalysisSchema>;

/* ---------- Hair ---------- */

export const HairAnalysisSchema = z.object({
  photo: PhotoFeedback,
  length: z.string(),
  texture: z.string().describe("Only what is visible, e.g. straight / wavy / curly / coily"),
  currentCut: z.string(),
  recommendedStyles: z.array(Suggestion),
  barberScript: z.string().describe("A short paragraph the user can read/show to the barber"),
  routine: z.array(z.object({ step: z.string(), frequency: z.string(), how: z.string() })),
  products: z.array(z.object({ type: z.string(), why: z.string(), budgetTip: z.string() })),
});
export type HairAnalysis = z.infer<typeof HairAnalysisSchema>;

/* ---------- Style ---------- */

export const StyleAnalysisSchema = z.object({
  photo: PhotoFeedback,
  items: z.array(z.object({ item: z.string(), color: z.string() })),
  colorHarmony: z.object({
    summary: z.string(),
    works: z.array(z.string()),
    improve: z.array(z.string()),
  }),
  itemMatch: z.object({
    score: z.number().describe("1-10: how well the clothing items work together. Rates the outfit only, never the person."),
    explanation: z.string(),
  }),
  shoes: z.string(),
  upgrades: z.array(z.string()),
  newPieces: z.array(z.object({ item: z.string(), why: z.string(), priceRange: z.string() })),
  inspiration: z.array(z.object({ name: z.string(), description: z.string() })),
});
export type StyleAnalysis = z.infer<typeof StyleAnalysisSchema>;

/* ---------- Skin routine (from questionnaire, no photo diagnosis) ---------- */

const RoutineItem = z.object({
  step: z.string(),
  product: z.string(),
  how: z.string(),
  minutes: z.number(),
});

export const SkinRoutineSchema = z.object({
  summary: z.string(),
  morning: z.array(RoutineItem),
  evening: z.array(RoutineItem),
  weekly: z.array(RoutineItem),
  productNotes: z.array(
    z.object({
      product: z.string(),
      verdict: z.enum(["keep", "optional", "replace", "unknown"]),
      note: z.string(),
    }),
  ),
  tips: z.array(z.string()),
  dermatologistNote: z.string(),
});
export type SkinRoutine = z.infer<typeof SkinRoutineSchema>;

/* ---------- Plan ---------- */

export const CATEGORIES = ["skin", "hair", "style", "fitness", "posture", "sleep", "nutrition", "mindset"] as const;

export const PlanSchema = z.object({
  summary: z.string(),
  weeks: z.array(z.object({ week: z.number(), focus: z.string() })),
  morningRoutine: z.array(z.object({ step: z.string(), how: z.string(), minutes: z.number() })),
  eveningRoutine: z.array(z.object({ step: z.string(), how: z.string(), minutes: z.number() })),
  tasks: z.array(
    z.object({
      title: z.string(),
      category: z.enum(CATEGORIES),
      minutes: z.number(),
      how: z.string(),
      why: z.string(),
      frequency: z.enum(["daily", "3x_week", "weekly", "once"]),
      startWeek: z.number().describe("1-4"),
    }),
  ),
});
export type PlanAI = z.infer<typeof PlanSchema>;

export const DailyTasksSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      category: z.enum(CATEGORIES),
      minutes: z.number(),
      how: z.string(),
      why: z.string(),
    }),
  ),
});
export type DailyTasksAI = z.infer<typeof DailyTasksSchema>;

/* ---------- Request bodies (validated on the server) ---------- */

/* ---------- Photo ratings (adults, opt-in personal mode) ---------- */

const RatingItem = z.object({
  score: z.number().int().min(0).max(100),
  note: z.string().describe("One short sentence: what this score reflects in THIS photo"),
  tip: z.string().describe("One realistic thing to try (grooming, routine, training, lighting)"),
});
const base = {
  photoUsable: z.boolean().describe("false if the photo is too dark/blurry/cropped/angled to rate; then every score is 0"),
  photoQuality: z.enum(["low", "ok", "good"]),
  summary: z.string().describe("Two warm, realistic sentences. Say these are subjective estimates from one photo and shift with lighting, angle and pose."),
};
export const FaceRatingsSchema = z.object({
  ...base,
  overall: RatingItem,
  potential: RatingItem.describe("Glow-up potential: how much visible grooming, skin, hair and style changes could improve this photo"),
  jawline: RatingItem,
  cheekbones: RatingItem,
  skin: RatingItem,
  grooming: RatingItem,
  presentation: RatingItem.nullable().describe("How strongly the features read as masculine (male profile) or feminine (female profile) in this photo. null for other profiles"),
});
export const HairRatingsSchema = z.object({
  ...base,
  overall: RatingItem,
  condition: RatingItem.describe("Visible dryness, frizz, shine, scalp visibility"),
  volume: RatingItem,
  styleFit: RatingItem.describe("How well the current cut/style suits the visible face shape"),
  neatness: RatingItem,
});
export const BodyRatingsSchema = z.object({
  ...base,
  overall: RatingItem,
  posture: RatingItem,
  shoulders: RatingItem,
  upperBody: RatingItem.describe("Visible chest/back/arm development in this pose"),
  core: RatingItem,
  lowerBody: RatingItem,
});
export type FaceRatings = z.infer<typeof FaceRatingsSchema>;
export type HairRatings = z.infer<typeof HairRatingsSchema>;
export type BodyRatings = z.infer<typeof BodyRatingsSchema>;
export type PhotoRatings = FaceRatings | HairRatings | BodyRatings;

/* ---------- Concerns ---------- */

export const ConcernAnalysisSchema = z.object({
  understanding: z.string().describe("What the user is describing, in neutral words"),
  kind: z.enum(["observable", "subjective_preference", "mixed", "unclear"]).describe(
    "Is this an objectively observable matter, a subjective preference, both, or unclear. Never assume a feature is a flaw just because the user dislikes it.",
  ),
  known: z.array(z.string()).describe("What is known from the text/photo"),
  unknown: z.array(z.string()).describe("What is NOT known and would be needed"),
  possibleExplanations: z.array(z.string()).describe("Possible explanations, phrased as possibilities, never as diagnoses"),
  realisticOutlook: z.string().describe("What can realistically be improved and what cannot"),
  steps: z.array(z.object({ title: z.string(), how: z.string(), minutes: z.number() })),
  products: z.array(z.object({ type: z.string(), why: z.string(), budgetTip: z.string() })).describe("Only if truly useful; empty array otherwise"),
  videoQueries: z.array(z.string()).describe("Search queries for educational videos. Do not invent video titles or URLs."),
  dailyTasks: z.array(z.object({ title: z.string(), how: z.string(), minutes: z.number() })),
  trackingMetrics: z.array(z.string()),
  seeProfessional: z.object({ recommended: z.boolean(), when: z.string() }),
  supportiveNote: z.string().describe("One short, warm, realistic sentence. No shaming, no validation of harsh self-criticism."),
});
export type ConcernAnalysisAI = z.infer<typeof ConcernAnalysisSchema>;

export const ConcernAnalyzeRequest = z.object({
  profile: z.lazy(() => ProfileContext).optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000),
  category: z.string().max(20),
  image: z
    .object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(7_000_000) })
    .optional(),
});

export const ProfileContext = z
  .object({
    name: z.string().max(60).optional(),
    age: z.number().min(10).max(100).optional(),
    gender: z.string().max(20).optional(),
    goals: z.array(z.string().max(30)).max(10).optional(),
    minutesPerDay: z.number().min(5).max(240).optional(),
    budget: z.string().max(20).optional(),
    skinType: z.string().max(20).optional(),
    fitnessLevel: z.string().max(20).optional(),
    language: z.enum(["he", "en"]).optional(),
    heightCm: z.number().min(50).max(260).optional(),
  })
  .passthrough();

const ImagePayload = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().max(7_000_000), // base64, ~5MB
});

export const AnalyzeRequest = z.discriminatedUnion("type", [
  z.object({ type: z.literal("face"), image: ImagePayload, profile: ProfileContext.optional(), wearsGlasses: z.boolean().optional() }),
  z.object({ type: z.literal("ratings"), scope: z.enum(["face", "hair", "body"]), image: ImagePayload, profile: ProfileContext.optional() }),
  z.object({ type: z.literal("hair"), image: ImagePayload, profile: ProfileContext.optional(), faceShape: z.string().max(30).optional() }),
  z.object({ type: z.literal("style"), image: ImagePayload, profile: ProfileContext.optional(), occasion: z.string().max(100).optional() }),
  z.object({
    type: z.literal("skin"),
    profile: ProfileContext.optional(),
    skinType: z.string().max(30),
    concerns: z.array(z.string().max(40)).max(10),
    products: z.string().max(2000),
    minutes: z.number().min(1).max(60),
  }),
]);
export type AnalyzeRequestT = z.infer<typeof AnalyzeRequest>;
