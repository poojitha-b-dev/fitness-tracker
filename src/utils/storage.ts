// src/utils/storage.ts
// Handles both localStorage (fast, offline) and Firestore (cloud, cross-device).
// Each write goes to localStorage immediately for speed, then syncs to Firestore.

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  USER:           'fitness-app-user',
  WORKOUTS:       'fitness-app-workouts',
  NUTRITION:      'fitness-app-nutrition',
  HEALTH_METRICS: 'fitness-app-health-metrics',
  GOALS:          'fitness-app-goals',
} as const;

// ─── Generic local helpers ────────────────────────────────────────────────────
const local = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  set: <T>(key: string, value: T): void => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ─── Firestore helpers ────────────────────────────────────────────────────────
const uid = () => auth.currentUser?.uid;

// Save a single document to a user's sub-collection
const fsSet = async (collectionName: string, id: string, data: object) => {
  const u = uid();
  if (!u) return;
  try {
    await setDoc(doc(db, 'users', u, collectionName, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn(`Firestore write failed (${collectionName}):`, e);
  }
};

// Delete a single document from a user's sub-collection
const fsDel = async (collectionName: string, id: string) => {
  const u = uid();
  if (!u) return;
  try {
    await deleteDoc(doc(db, 'users', u, collectionName, id));
  } catch (e) {
    console.warn(`Firestore delete failed (${collectionName}):`, e);
  }
};

// Load all docs from a user's sub-collection
const fsGetAll = async (collectionName: string): Promise<any[]> => {
  const u = uid();
  if (!u) return [];
  try {
    const snap = await getDocs(collection(db, 'users', u, collectionName));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (e) {
    console.warn(`Firestore read failed (${collectionName}):`, e);
    return [];
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const storage = {
  // ── User profile ──────────────────────────────────────────────────────────
  getUser: ()        => local.get(KEYS.USER),
  setUser: (u: any)  => local.set(KEYS.USER, u),

  // ── Workouts ──────────────────────────────────────────────────────────────
  getWorkouts: (): any[] => local.get(KEYS.WORKOUTS) || [],

  setWorkouts: (workouts: any[]) => {
    local.set(KEYS.WORKOUTS, workouts);
  },

  addWorkout: async (workout: any) => {
    const existing = storage.getWorkouts();
    const updated  = [...existing, workout];
    local.set(KEYS.WORKOUTS, updated);
    await fsSet('workouts', workout.id, workout);
    return updated;
  },

  updateWorkout: async (workout: any) => {
    const updated = storage.getWorkouts().map((w: any) => w.id === workout.id ? workout : w);
    local.set(KEYS.WORKOUTS, updated);
    await fsSet('workouts', workout.id, workout);
    return updated;
  },

  deleteWorkout: async (id: string) => {
    const updated = storage.getWorkouts().filter((w: any) => w.id !== id);
    local.set(KEYS.WORKOUTS, updated);
    await fsDel('workouts', id);
    return updated;
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  getNutrition: (): any[] => local.get(KEYS.NUTRITION) || [],

  setNutrition: (logs: any[]) => {
    local.set(KEYS.NUTRITION, logs);
  },

  saveNutritionLog: async (log: any) => {
    const existing = storage.getNutrition();
    const idx      = existing.findIndex((l: any) => l.date === log.date);
    const updated  = idx >= 0
      ? existing.map((l: any, i: number) => i === idx ? log : l)
      : [...existing, log];
    local.set(KEYS.NUTRITION, updated);
    await fsSet('nutrition', log.id, log);
    return updated;
  },

  // ── Health Metrics ────────────────────────────────────────────────────────
  getHealthMetrics: (): any[] => local.get(KEYS.HEALTH_METRICS) || [],

  setHealthMetrics: (metrics: any[]) => {
    local.set(KEYS.HEALTH_METRICS, metrics);
  },

  addHealthMetric: async (metric: any) => {
    const existing = storage.getHealthMetrics();
    const updated  = [...existing, metric].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    local.set(KEYS.HEALTH_METRICS, updated);
    await fsSet('healthMetrics', metric.id, metric);
    return updated;
  },

  updateHealthMetric: async (metric: any) => {
    const updated = storage.getHealthMetrics().map((m: any) => m.id === metric.id ? metric : m);
    local.set(KEYS.HEALTH_METRICS, updated);
    await fsSet('healthMetrics', metric.id, metric);
    return updated;
  },

  deleteHealthMetric: async (id: string) => {
    const updated = storage.getHealthMetrics().filter((m: any) => m.id !== id);
    local.set(KEYS.HEALTH_METRICS, updated);
    await fsDel('healthMetrics', id);
    return updated;
  },

  // ── Goals ─────────────────────────────────────────────────────────────────
  getGoals: (): any[] => local.get(KEYS.GOALS) || [],

  setGoals: (goals: any[]) => {
    local.set(KEYS.GOALS, goals);
  },

  addGoal: async (goal: any) => {
    const updated = [...storage.getGoals(), goal];
    local.set(KEYS.GOALS, updated);
    await fsSet('goals', goal.id, goal);
    return updated;
  },

  updateGoal: async (goal: any) => {
    const updated = storage.getGoals().map((g: any) => g.id === goal.id ? goal : g);
    local.set(KEYS.GOALS, updated);
    await fsSet('goals', goal.id, goal);
    return updated;
  },

  deleteGoal: async (id: string) => {
    const updated = storage.getGoals().filter((g: any) => g.id !== id);
    local.set(KEYS.GOALS, updated);
    await fsDel('goals', id);
    return updated;
  },

  // ── Cloud sync — call once on login to pull Firestore data into localStorage ──
  syncFromCloud: async () => {
    const [workouts, nutrition, healthMetrics, goals] = await Promise.all([
      fsGetAll('workouts'),
      fsGetAll('nutrition'),
      fsGetAll('healthMetrics'),
      fsGetAll('goals'),
    ]);
    if (workouts.length)      local.set(KEYS.WORKOUTS, workouts);
    if (nutrition.length)     local.set(KEYS.NUTRITION, nutrition);
    if (healthMetrics.length) local.set(KEYS.HEALTH_METRICS, healthMetrics);
    if (goals.length)         local.set(KEYS.GOALS, goals);
  },

  // ── Clear all local data on logout ────────────────────────────────────────
  clearAll: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
