"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalysisRecord,
  Checkin,
  CoachMessage,
  Concern,
  FaceScan,
  ConcernStatus,
  DebloatEntry,
  Fragrance,
  FragranceLog,
  OralDay,
  HaircutTried,
  Lang,
  Plan,
  PlanTask,
  Product,
  Profile,
  ProgressPhoto,
  Workout,
} from "./types";
import { addDays, dateKey } from "./utils";
import { tasksForDate, XP } from "./plan";
import { clearImages, deleteImage } from "./images";

interface State {
  profile: Profile | null;
  plan: Plan | null;
  completions: Record<string, string[]>;
  customTasks: Record<string, PlanTask[]>;
  checkins: Record<string, Checkin>;
  workouts: Workout[];
  analyses: AnalysisRecord[];
  favorites: string[];
  haircuts: HaircutTried[];
  products: Product[];
  photos: ProgressPhoto[];
  coach: CoachMessage[];
  manualFaceShape: string | null;
  theme: "dark" | "light";
  lang: Lang;
  concerns: Concern[];
  priorityPins: string[];
  advancedRatings: boolean;
  sidebarCollapsed: boolean;
  hiddenWidgets: string[];
  bodyMetrics: BodyMetric[];
  scans: FaceScan[];
  groomingLog: Record<string, string>; // grooming task id -> last done date
  oral: Record<string, OralDay>;
  dentist: { lastVisit?: string; intervalMonths: number };
  debloat: DebloatEntry[];
  fragrances: Fragrance[];
  fragranceLog: FragranceLog[];
  tipFavorites: string[];
  tipHidden: string[];
  tipDone: Record<string, string[]>; // tip id -> dates completed
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number; // user-measured (scale, caliper, DEXA) — never estimated by the app
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  note?: string;
}

interface Actions {
  setSidebarCollapsed: (v: boolean) => void;
  toggleWidget: (id: string) => void;
  addBodyMetric: (m: BodyMetric) => void;
  removeBodyMetric: (id: string) => void;
  toggleTipFavorite: (id: string) => void;
  toggleTipHidden: (id: string) => void;
  toggleTipDone: (id: string, date?: string) => void;
  markGroomed: (taskId: string, date?: string) => void;
  toggleOral: (key: keyof OralDay, date?: string) => void;
  setDentist: (d: { lastVisit?: string; intervalMonths: number }) => void;
  addDebloat: (e: DebloatEntry) => void;
  removeDebloat: (id: string) => void;
  upsertFragrance: (f: Fragrance) => void;
  removeFragrance: (id: string) => void;
  addFragranceLog: (l: FragranceLog) => void;
  removeFragranceLog: (id: string) => void;
  addScan: (s: FaceScan) => void;
  updateScan: (id: string, patch: Partial<FaceScan>) => void;
  removeScan: (id: string) => void;
  setAdvancedRatings: (v: boolean) => void;
  setLang: (l: Lang) => void;
  addConcern: (c: Concern) => void;
  updateConcern: (id: string, patch: Partial<Concern>) => void;
  setConcernStatus: (id: string, status: ConcernStatus) => void;
  removeConcern: (id: string) => void;
  addConcernMessage: (id: string, m: CoachMessage) => void;
  updateConcernMessage: (id: string, mid: string, content: string) => void;
  addConcernProgress: (id: string, entry: Concern["progress"][number]) => void;
  setPriorityPins: (ids: string[]) => void;
  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setPlan: (p: Plan | null) => void;
  toggleTask: (taskId: string, date?: string) => void;
  addCustomTasks: (tasks: PlanTask[], date?: string) => void;
  removeCustomTask: (taskId: string, date: string) => void;
  saveCheckin: (c: Checkin) => void;
  addWorkout: (w: Workout) => void;
  removeWorkout: (id: string) => void;
  addAnalysis: (a: AnalysisRecord) => void;
  removeAnalysis: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addHaircut: (h: HaircutTried) => void;
  removeHaircut: (id: string) => void;
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  addPhoto: (p: ProgressPhoto) => void;
  removePhoto: (id: string) => void;
  addCoachMessage: (m: CoachMessage) => void;
  updateCoachMessage: (id: string, content: string) => void;
  clearCoach: () => void;
  setManualFaceShape: (s: string | null) => void;
  setTheme: (t: "dark" | "light") => void;
  deleteAllPhotos: () => Promise<void>;
  resetAll: () => Promise<void>;
  importData: (data: Partial<State>) => void;
}

const initial: State = {
  profile: null,
  plan: null,
  completions: {},
  customTasks: {},
  checkins: {},
  workouts: [],
  analyses: [],
  favorites: [],
  haircuts: [],
  products: [],
  photos: [],
  coach: [],
  manualFaceShape: null,
  theme: "light",
  lang: "he",
  concerns: [],
  priorityPins: [],
  advancedRatings: false,
  sidebarCollapsed: false,
  hiddenWidgets: [],
  bodyMetrics: [],
  scans: [],
  groomingLog: {},
  oral: {},
  dentist: { intervalMonths: 6 },
  debloat: [],
  fragrances: [],
  fragranceLog: [],
  tipFavorites: [],
  tipHidden: [],
  tipDone: {},
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setLang: (lang) => set({ lang }),
      setAdvancedRatings: (advancedRatings) => set({ advancedRatings }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleWidget: (id) => set((s) => ({ hiddenWidgets: s.hiddenWidgets.includes(id) ? s.hiddenWidgets.filter((w) => w !== id) : [...s.hiddenWidgets, id] })),
      addBodyMetric: (m) => set((s) => ({ bodyMetrics: [...s.bodyMetrics, m].sort((a, b) => a.date.localeCompare(b.date)) })),
      toggleTipFavorite: (id) => set((s) => ({ tipFavorites: s.tipFavorites.includes(id) ? s.tipFavorites.filter((x) => x !== id) : [...s.tipFavorites, id] })),
      toggleTipHidden: (id) => set((s) => ({ tipHidden: s.tipHidden.includes(id) ? s.tipHidden.filter((x) => x !== id) : [...s.tipHidden, id] })),
      toggleTipDone: (id, date = dateKey()) =>
        set((s) => {
          const cur = s.tipDone[id] ?? [];
          return { tipDone: { ...s.tipDone, [id]: cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date] } };
        }),
      markGroomed: (taskId, date = dateKey()) => set((s) => ({ groomingLog: { ...s.groomingLog, [taskId]: date } })),
      toggleOral: (key, date = dateKey()) =>
        set((s) => ({ oral: { ...s.oral, [date]: { ...s.oral[date], [key]: !s.oral[date]?.[key] } } })),
      setDentist: (dentist) => set({ dentist }),
      addDebloat: (e) => set((s) => ({ debloat: [e, ...s.debloat].slice(0, 500) })),
      removeDebloat: (id) => set((s) => ({ debloat: s.debloat.filter((x) => x.id !== id) })),
      upsertFragrance: (f) =>
        set((s) => ({ fragrances: s.fragrances.some((x) => x.id === f.id) ? s.fragrances.map((x) => (x.id === f.id ? f : x)) : [f, ...s.fragrances] })),
      removeFragrance: (id) =>
        set((s) => ({ fragrances: s.fragrances.filter((x) => x.id !== id), fragranceLog: s.fragranceLog.filter((l) => l.fragranceId !== id) })),
      addFragranceLog: (l) => set((s) => ({ fragranceLog: [l, ...s.fragranceLog].slice(0, 500) })),
      removeFragranceLog: (id) => set((s) => ({ fragranceLog: s.fragranceLog.filter((x) => x.id !== id) })),
      addScan: (scan) => set((s) => ({ scans: [scan, ...s.scans].slice(0, 40) })),
      updateScan: (id, patch) => set((s) => ({ scans: s.scans.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeScan: (id) => {
        const sc = get().scans.find((x) => x.id === id);
        Object.values(sc?.images ?? {}).forEach((img) => deleteImage(img));
        set((s) => ({ scans: s.scans.filter((x) => x.id !== id) }));
      },
      removeBodyMetric: (id) => set((s) => ({ bodyMetrics: s.bodyMetrics.filter((m) => m.id !== id) })),
      addConcern: (c) => set((s) => ({ concerns: [c, ...s.concerns] })),
      updateConcern: (id, patch) => set((s) => ({ concerns: s.concerns.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      setConcernStatus: (id, status) => set((s) => ({ concerns: s.concerns.map((c) => (c.id === id ? { ...c, status } : c)) })),
      removeConcern: (id) => {
        const c = get().concerns.find((x) => x.id === id);
        if (c?.imageId) deleteImage(c.imageId);
        set((s) => ({ concerns: s.concerns.filter((x) => x.id !== id), priorityPins: s.priorityPins.filter((p) => p !== `concern:${id}`) }));
      },
      addConcernMessage: (id, m) =>
        set((s) => ({ concerns: s.concerns.map((c) => (c.id === id ? { ...c, thread: [...c.thread, m].slice(-60) } : c)) })),
      updateConcernMessage: (id, mid, content) =>
        set((s) => ({
          concerns: s.concerns.map((c) => (c.id === id ? { ...c, thread: c.thread.map((m) => (m.id === mid ? { ...m, content } : m)) } : c)),
        })),
      addConcernProgress: (id, entry) =>
        set((s) => ({ concerns: s.concerns.map((c) => (c.id === id ? { ...c, progress: [...c.progress, entry] } : c)) })),
      setPriorityPins: (priorityPins) => set({ priorityPins }),
      setProfile: (profile) => set({ profile }),
      updateProfile: (p) => set((s) => (s.profile ? { profile: { ...s.profile, ...p } } : {})),
      setPlan: (plan) => set({ plan }),
      toggleTask: (taskId, date = dateKey()) =>
        set((s) => {
          const cur = new Set(s.completions[date] ?? []);
          if (cur.has(taskId)) cur.delete(taskId);
          else cur.add(taskId);
          return { completions: { ...s.completions, [date]: [...cur] } };
        }),
      addCustomTasks: (tasks, date = dateKey()) =>
        set((s) => ({
          customTasks: { ...s.customTasks, [date]: [...(s.customTasks[date] ?? []), ...tasks] },
        })),
      removeCustomTask: (taskId, date) =>
        set((s) => ({
          customTasks: { ...s.customTasks, [date]: (s.customTasks[date] ?? []).filter((t) => t.id !== taskId) },
        })),
      saveCheckin: (c) => set((s) => ({ checkins: { ...s.checkins, [c.date]: c } })),
      addWorkout: (w) => set((s) => ({ workouts: [w, ...s.workouts] })),
      removeWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      addAnalysis: (a) => set((s) => ({ analyses: [a, ...s.analyses].slice(0, 60) })),
      removeAnalysis: (id) => {
        const a = get().analyses.find((x) => x.id === id);
        if (a?.imageId) deleteImage(a.imageId);
        set((s) => ({ analyses: s.analyses.filter((x) => x.id !== id) }));
      },
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
        })),
      addHaircut: (h) => set((s) => ({ haircuts: [h, ...s.haircuts] })),
      removeHaircut: (id) => {
        const h = get().haircuts.find((x) => x.id === id);
        if (h?.imageId) deleteImage(h.imageId);
        set((s) => ({ haircuts: s.haircuts.filter((x) => x.id !== id) }));
      },
      upsertProduct: (p) =>
        set((s) => {
          const exists = s.products.some((x) => x.id === p.id);
          return { products: exists ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] };
        }),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      removePhoto: (id) => {
        const p = get().photos.find((x) => x.id === id);
        if (p) deleteImage(p.imageId);
        set((s) => ({ photos: s.photos.filter((x) => x.id !== id) }));
      },
      addCoachMessage: (m) => set((s) => ({ coach: [...s.coach, m].slice(-100) })),
      updateCoachMessage: (id, content) =>
        set((s) => ({ coach: s.coach.map((m) => (m.id === id ? { ...m, content } : m)) })),
      clearCoach: () => set({ coach: [] }),
      setManualFaceShape: (manualFaceShape) => set({ manualFaceShape }),
      setTheme: (theme) => set({ theme }),
      deleteAllPhotos: async () => {
        await clearImages();
        set((s) => ({
          photos: [],
          analyses: s.analyses.map((a) => ({ ...a, imageId: undefined })),
          haircuts: s.haircuts.map((h) => ({ ...h, imageId: undefined })),
          concerns: s.concerns.map((c) => ({ ...c, imageId: undefined })),
          scans: [],
          profile: s.profile ? { ...s.profile, avatarImageId: undefined } : null,
        }));
      },
      resetAll: async () => {
        await clearImages();
        set({ ...initial, theme: get().theme, lang: get().lang });
      },
      importData: (data) => set((s) => ({ ...s, ...data })),
    }),
    {
      name: "glowup-ai-v1",
      version: 2,
      migrate: (persisted, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = persisted as any;
        if (version < 2) {
          const legacy: Record<string, string> = { hair: "haircut", fitness: "muscle" };
          if (st.profile) {
            st.profile.goals = (st.profile.goals ?? []).map((g: string) => legacy[g] ?? g);
            st.profile.units ??= "metric";
            st.profile.growthSex ??= "";
            st.profile.lifestyle ??= {};
          }
          st.lang ??= "he";
          st.concerns ??= [];
          st.priorityPins ??= [];
        }
        return st;
      },
    },
  ),
);

/* ---------- Derived selectors ---------- */

export function useTodayTasks(date: string = dateKey()) {
  const plan = useStore((s) => s.plan);
  const custom = useStore((s) => s.customTasks);
  return tasksForDate(plan, date, custom);
}

export function dayScore(
  s: Pick<State, "plan" | "customTasks" | "completions" | "checkins">,
  date: string,
) {
  const tasks = tasksForDate(s.plan, date, s.customTasks);
  const done = new Set(s.completions[date] ?? []);
  const doneCount = tasks.filter((t) => done.has(t.id)).length;
  const checkin = s.checkins[date] ? 1 : 0;
  const total = tasks.length + 1; // + daily check-in
  return {
    total: tasks.length,
    done: doneCount,
    checkin: Boolean(checkin),
    score: total > 0 ? Math.round(((doneCount + checkin) / total) * 100) : 0,
  };
}

export function computeXP(s: Pick<State, "completions" | "checkins" | "workouts" | "analyses" | "photos">) {
  const tasks = Object.values(s.completions).reduce((a, b) => a + b.length, 0);
  return (
    tasks * XP.task +
    Object.keys(s.checkins).length * XP.checkin +
    s.workouts.length * XP.workout +
    s.analyses.length * XP.analysis +
    s.photos.length * XP.photo
  );
}

export function computeStreak(s: Pick<State, "completions" | "checkins">) {
  const active = (d: string) => (s.completions[d]?.length ?? 0) > 0 || Boolean(s.checkins[d]);
  let day = dateKey();
  if (!active(day)) day = addDays(day, -1); // today not done yet doesn't break the streak
  let streak = 0;
  while (active(day)) {
    streak++;
    day = addDays(day, -1);
  }
  // best streak
  const all = new Set([...Object.keys(s.completions).filter((d) => s.completions[d].length), ...Object.keys(s.checkins)]);
  let best = 0;
  for (const d of all) {
    if (all.has(addDays(d, -1))) continue;
    let len = 0;
    let cur = d;
    while (all.has(cur)) {
      len++;
      cur = addDays(cur, 1);
    }
    best = Math.max(best, len);
  }
  return { current: streak, best: Math.max(best, streak) };
}
