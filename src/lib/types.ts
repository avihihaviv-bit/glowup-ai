export type Category =
  | "skin"
  | "hair"
  | "style"
  | "fitness"
  | "posture"
  | "sleep"
  | "nutrition"
  | "mindset";

export type Frequency = "daily" | "3x_week" | "weekly" | "once";

export type Gender = "male" | "female" | "other" | "";

export type Goal =
  | "grooming"
  | "haircut"
  | "skin"
  | "hairHealth"
  | "muscle"
  | "posture"
  | "growth"
  | "sleep"
  | "nutrition"
  | "puffiness"
  | "style"
  | "confidence";

export type Lang = "he" | "en";
export type Units = "metric" | "imperial";
export type GrowthSex = "male" | "female" | "";

export type Budget = "low" | "medium" | "high";

export type SkinType = "oily" | "dry" | "combination" | "normal" | "sensitive" | "unknown";

export interface Lifestyle {
  sleepHours?: number;
  bedtime?: string;
  wakeTime?: string;
  waterGlasses?: number;
  exerciseDays?: number;
  gymExperience?: "none" | "beginner" | "intermediate" | "advanced";
  equipment?: string[];
  hairWash?: string;
  skinRoutine?: string;
  diet?: string[];
  restrictions?: string;
}

export interface Profile {
  name: string;
  age: number; // derived from dob when available
  dob?: string; // yyyy-mm-dd
  heightCm?: number;
  units: Units;
  country?: string;
  growthSex: GrowthSex; // optional, only used for growth reference charts
  gender: Gender;
  goals: Goal[];
  minutesPerDay: number;
  budget: Budget;
  skinType: SkinType;
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  lifestyle: Lifestyle;
  avatarImageId?: string;
  createdAt: string;
}

export type ConcernCategory =
  | "skin"
  | "hair"
  | "face"
  | "body"
  | "posture"
  | "fitness"
  | "nutrition"
  | "bloating"
  | "sleep"
  | "growth"
  | "style"
  | "other";

export type ConcernStatus = "new" | "inProgress" | "improving" | "completed";

export interface ConcernAnalysis {
  source: "ai" | "demo";
  date: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // ConcernAnalysisAI shape (see schemas.ts)
}

export interface Concern {
  id: string;
  title: string;
  description: string;
  category: ConcernCategory;
  imageId?: string;
  status: ConcernStatus;
  createdAt: string;
  analysis?: ConcernAnalysis;
  progress: { date: string; note: string; rating: number }[]; // rating 1-5: how it feels today
  thread: CoachMessage[];
}

export interface PlanTask {
  id: string;
  title: string;
  category: Category;
  minutes: number;
  how: string;
  why: string;
  frequency: Frequency;
  startWeek: number;
  custom?: boolean;
}

export interface RoutineStep {
  step: string;
  how: string;
  minutes: number;
}

export interface Plan {
  createdAt: string;
  startDate: string; // yyyy-mm-dd
  source: "ai" | "demo";
  summary: string;
  weeks: { week: number; focus: string }[];
  morningRoutine: RoutineStep[];
  eveningRoutine: RoutineStep[];
  tasks: PlanTask[];
  days: { day: number; taskIds: string[] }[];
}

export interface Checkin {
  date: string;
  mood: number; // 1-5
  energy: number; // 1-5
  sleepHours: number;
  waterGlasses: number;
  posture: number; // 1-5 self rating of posture awareness today
  ateVeggies: boolean;
  note: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: string;
  date: string;
  type: "strength" | "cardio" | "mobility" | "posture" | "sport";
  durationMin: number;
  exercises: Exercise[];
  notes: string;
}

export type AnalysisType = "face" | "hair" | "style" | "skin" | "ratings" | "skinScan";

export interface AnalysisRecord {
  id: string;
  type: AnalysisType;
  date: string;
  source: "ai" | "demo";
  imageId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
}

export interface HaircutTried {
  id: string;
  date: string;
  name: string;
  notes: string;
  rating: number;
  imageId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: "cleanser" | "moisturizer" | "spf" | "serum" | "hair" | "oral" | "deodorant" | "other";
  use: "morning" | "evening" | "both";
  liked: boolean;
  notes: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  imageId: string;
  note: string;
  category: "face" | "hair" | "body" | "style";
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  demo?: boolean;
}

export type ScanStepId = "front" | "left" | "right";

export interface ScanImageQuality {
  brightness: number;
  sharpness: number;
  width: number;
  height: number;
  issues: string[];
}

export interface FaceScan {
  id: string;
  date: string;
  createdAt: string;
  images: Partial<Record<ScanStepId, string>>; // IndexedDB image ids
  observations?: { widthToHeight: number; jawToCheek: number; foreheadToCheek: number; midToLower: number; asymmetry: number; rollDeg: number; turn: number; shapeGuess: string; aspect: number };
  landmarks: number[]; // packed front landmarks (x, y, z) from MediaPipe, 2D photo + estimated relative depth
  quality: Partial<Record<ScanStepId, ScanImageQuality>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report?: { source: "ai"; date: string; data: any };
}

export interface DebloatEntry {
  id: string;
  date: string;
  time: string;
  area: "face" | "underEye" | "abdomen";
  severity: number; // 1-5, self-reported
  foods: string;
  notes: string;
  better?: "better" | "same" | "worse";
}

export interface OralDay {
  am?: boolean;
  pm?: boolean;
  floss?: boolean;
  tongue?: boolean;
}

export type Concentration = "EDC" | "EDT" | "EDP" | "Parfum" | "Other";

export interface Fragrance {
  id: string;
  name: string;
  brand: string;
  concentration: Concentration;
  family: string;
  seasons: ("spring" | "summer" | "autumn" | "winter")[];
  occasions: string[];
  rating: number; // 1-5, the user's own rating
  longevity: string; // user's own notes
  projection: string; // user's own notes
  notes: string; // user's own notes (we never invent fragrance notes)
}

export interface FragranceLog {
  id: string;
  date: string;
  fragranceId: string;
  sprays: number;
  occasion: string;
  notes: string;
}

export type EventType = "casual" | "school" | "birthday" | "barMitzvah" | "family" | "date" | "party" | "formal" | "outdoor";

export interface OutingPlan {
  id: string;
  type: EventType;
  title: string;
  start: string; // ISO datetime
  weather: "hot" | "mild" | "cold" | "rain";
  indoor: boolean;
  checks: Record<string, boolean>; // readiness checklist + timeline items
  createdAt: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  slot: "top" | "bottom" | "shoes" | "outer" | "accessory";
  color: string;
  seasons: ("hot" | "mild" | "cold")[];
  occasions: string[];
  imageId?: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: string[]; // wardrobe item ids
  favorite: boolean;
  createdAt: string;
}

export interface BarberBrief {
  id: string;
  createdAt: string;
  cutName: string;
  hairType: string;
  currentLength: string;
  topLength: string;
  sideLength: string;
  fade: string;
  texture: string;
  styling: string;
  avoid: string;
  maintenance: string;
  imageId?: string;
}

export interface ScannedProduct {
  id: string;
  date: string;
  name: string;
  brand: string;
  type: string;
  ingredients: string[];
  ingredientsSource: "label" | "database" | "none";
  purpose: string;
  howToUse: string;
  warnings: string[];
  confidence: "low" | "medium" | "high";
  barcode?: string;
  imageId?: string;
}
