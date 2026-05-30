// src/types/index.ts

export interface User {
  id: string;
  name: string;
  age: number;
  height: number;       // cm
  currentWeight: number; // kg
  goalWeight: number;   // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  goals: string[];
}

export interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'sports';
  muscleGroups: string[];
  description?: string;
}

export interface WorkoutSet {
  reps: number;
  weight?: number;   // kg
  duration?: number; // seconds
  distance?: number; // km
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  duration: number;       // minutes
  caloriesBurned?: number;
  notes?: string;
}

export interface Food {
  id: string;
  name: string;
  caloriesPerUnit: number;
  protein: number;  // grams per unit
  carbs: number;    // grams per unit
  fat: number;      // grams per unit
  fiber?: number;
  sugar?: number;
  unit: string;     // e.g. "100g", "1 cup"
}

export interface FoodEntry {
  foodId: string;
  foodName: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionLog {
  id: string;
  date: string;
  meals: {
    breakfast: FoodEntry[];
    lunch: FoodEntry[];
    dinner: FoodEntry[];
    snacks: FoodEntry[];
  };
  water: number;         // ml
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface HealthMetric {
  id: string;
  date: string;
  weight?: number;       // kg
  bodyFat?: number;      // %
  muscleMass?: number;   // kg
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  restingHeartRate?: number;
  sleepHours?: number;
  stressLevel?: number;  // 1-10
  energy?: number;       // 1-10
  notes?: string;
}

export interface Goal {
  id: string;
  type: 'weight' | 'strength' | 'endurance' | 'nutrition' | 'custom';
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high'; // ← was missing before, caused TS errors
}
