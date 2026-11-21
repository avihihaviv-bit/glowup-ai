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
  })
  .passthrough();

const ImagePayload = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().max(7_000_000), // base64, ~5MB
});

export const AnalyzeRequest = z.discriminatedUnion("type", [
  z.object({ type: z.literal("face"), image: ImagePayload, profile: ProfileContext.optional(), wearsGlasses: z.boolean().optional() }),
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
