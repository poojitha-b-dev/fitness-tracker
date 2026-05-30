import { Food } from '../types';

export const foods: Food[] = [
  // Proteins
  {
    id: 'chicken-breast',
    name: 'Chicken Breast',
    caloriesPerUnit: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    unit: '100g'
  },
  {
    id: 'salmon',
    name: 'Salmon',
    caloriesPerUnit: 208,
    protein: 22,
    carbs: 0,
    fat: 13,
    unit: '100g'
  },
  {
    id: 'eggs',
    name: 'Eggs',
    caloriesPerUnit: 155,
    protein: 13,
    carbs: 1,
    fat: 11,
    unit: '2 large'
  },
  {
    id: 'greek-yogurt',
    name: 'Greek Yogurt',
    caloriesPerUnit: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    unit: '170g'
  },

  // Carbohydrates
  {
    id: 'brown-rice',
    name: 'Brown Rice',
    caloriesPerUnit: 216,
    protein: 5,
    carbs: 45,
    fat: 1.8,
    fiber: 4,
    unit: '1 cup cooked'
  },
  {
    id: 'oats',
    name: 'Oats',
    caloriesPerUnit: 154,
    protein: 6,
    carbs: 28,
    fat: 3,
    fiber: 4,
    unit: '1/2 cup dry'
  },
  {
    id: 'sweet-potato',
    name: 'Sweet Potato',
    caloriesPerUnit: 112,
    protein: 2,
    carbs: 26,
    fat: 0,
    fiber: 4,
    unit: '1 medium'
  },
  {
    id: 'banana',
    name: 'Banana',
    caloriesPerUnit: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    fiber: 3,
    sugar: 14,
    unit: '1 medium'
  },

  // Vegetables
  {
    id: 'broccoli',
    name: 'Broccoli',
    caloriesPerUnit: 25,
    protein: 3,
    carbs: 5,
    fat: 0,
    fiber: 3,
    unit: '1 cup'
  },
  {
    id: 'spinach',
    name: 'Spinach',
    caloriesPerUnit: 7,
    protein: 1,
    carbs: 1,
    fat: 0,
    fiber: 1,
    unit: '1 cup'
  },
  {
    id: 'avocado',
    name: 'Avocado',
    caloriesPerUnit: 234,
    protein: 3,
    carbs: 12,
    fat: 21,
    fiber: 10,
    unit: '1 medium'
  },

  // Nuts and Seeds
  {
    id: 'almonds',
    name: 'Almonds',
    caloriesPerUnit: 161,
    protein: 6,
    carbs: 6,
    fat: 14,
    fiber: 4,
    unit: '28g (23 nuts)'
  },
  {
    id: 'peanut-butter',
    name: 'Peanut Butter',
    caloriesPerUnit: 188,
    protein: 8,
    carbs: 8,
    fat: 16,
    unit: '2 tbsp'
  }
];