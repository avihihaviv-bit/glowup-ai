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

export type AnalysisType = "face" | "hair" | "style" | "skin";

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
  category: "cleanser" | "moisturizer" | "spf" | "serum" | "hair" | "other";
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
