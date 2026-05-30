export const calculateBMI = (weight: number, height: number): number => {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  // Mifflin-St Jeor Equation
  const bmr = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? bmr + 5 : bmr - 161;
};

export const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const multipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very-active': 1.9,
  };
  return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.2);
};

export const calculateCaloriesForGoal = (tdee: number, goal: 'lose' | 'maintain' | 'gain'): number => {
  switch (goal) {
    case 'lose': return tdee - 500; // 1 lb/week loss
    case 'gain': return tdee + 500; // 1 lb/week gain
    default: return tdee;
  }
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getWeekDates = (date: Date): Date[] => {
  const week = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    week.push(day);
  }
  
  return week;
};

export const calculateWorkoutVolume = (exercises: any[]): number => {
  return exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal: number, set: any) => {
      return setTotal + (set.reps * (set.weight || 1));
    }, 0);
  }, 0);
};