import { Exercise } from '../types';

export const exercises: Exercise[] = [
  // Strength - Upper Body
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'strength',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    description: 'Classic chest exercise using barbell or dumbbells'
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    category: 'strength',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    description: 'Bodyweight exercise for upper body strength'
  },
  {
    id: 'pull-ups',
    name: 'Pull-ups',
    category: 'strength',
    muscleGroups: ['back', 'biceps'],
    description: 'Bodyweight exercise for back and bicep strength'
  },
  {
    id: 'rows',
    name: 'Barbell Rows',
    category: 'strength',
    muscleGroups: ['back', 'biceps'],
    description: 'Compound pulling exercise for back development'
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'strength',
    muscleGroups: ['shoulders', 'triceps'],
    description: 'Standing or seated shoulder press'
  },

  // Strength - Lower Body
  {
    id: 'squats',
    name: 'Squats',
    category: 'strength',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
    description: 'Fundamental lower body compound movement'
  },
  {
    id: 'deadlifts',
    name: 'Deadlifts',
    category: 'strength',
    muscleGroups: ['hamstrings', 'glutes', 'back'],
    description: 'Hip hinge movement, great for posterior chain'
  },
  {
    id: 'lunges',
    name: 'Lunges',
    category: 'strength',
    muscleGroups: ['quadriceps', 'glutes'],
    description: 'Unilateral leg exercise for balance and strength'
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'strength',
    muscleGroups: ['quadriceps', 'glutes'],
    description: 'Machine-based leg exercise'
  },

  // Cardio
  {
    id: 'running',
    name: 'Running',
    category: 'cardio',
    muscleGroups: ['legs', 'cardiovascular'],
    description: 'Outdoor or treadmill running'
  },
  {
    id: 'cycling',
    name: 'Cycling',
    category: 'cardio',
    muscleGroups: ['legs', 'cardiovascular'],
    description: 'Stationary or outdoor cycling'
  },
  {
    id: 'rowing',
    name: 'Rowing',
    category: 'cardio',
    muscleGroups: ['back', 'legs', 'cardiovascular'],
    description: 'Full body cardio on rowing machine'
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    category: 'cardio',
    muscleGroups: ['calves', 'cardiovascular'],
    description: 'High-intensity cardio exercise'
  },

  // Flexibility
  {
    id: 'yoga',
    name: 'Yoga',
    category: 'flexibility',
    muscleGroups: ['full-body'],
    description: 'Flexibility and mindfulness practice'
  },
  {
    id: 'stretching',
    name: 'Static Stretching',
    category: 'flexibility',
    muscleGroups: ['full-body'],
    description: 'Hold stretches for flexibility improvement'
  }
];