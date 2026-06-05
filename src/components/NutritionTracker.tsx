// src/components/NutritionTracker.tsx
// Fixes: #10 water as text, #11 calorie limits, #12 warnings,
//        #13 rotating tips, #14 custom nutrition goals, #16 default inputs
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Droplets, Target, Settings, AlertTriangle, X, Check } from 'lucide-react';
import { storage } from '../utils/storage';
import { foods } from '../data/foods';
import { NutritionLog, FoodEntry } from '../types';
import { formatDate } from '../utils/calculations';
import NumericInput from './NumericInput';

// ─── Nutrition goals stored in localStorage ───────────────────────────────────
const GOALS_KEY = 'fitness-app-nutrition-goals';
interface NutritionGoals { calories: number; protein: number; carbs: number; fat: number; water: number; }
const defaultGoals: NutritionGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65, water: 2000 };
const getGoals = (): NutritionGoals => {
  try { return { ...defaultGoals, ...JSON.parse(localStorage.getItem(GOALS_KEY) || '{}') }; }
  catch { return defaultGoals; }
};
const saveGoals = (g: NutritionGoals) => localStorage.setItem(GOALS_KEY, JSON.stringify(g));

// ─── Rotating tips — Fix #13 ──────────────────────────────────────────────────
const ALL_TIPS = [
  { title: 'Balanced Macros',      text: 'Aim for 45–65% carbs, 20–35% fat, and 10–35% protein for optimal health.' },
  { title: 'Stay Hydrated',        text: 'Drink at least 8 glasses (2 L) of water daily. Dehydration mimics hunger.' },
  { title: 'Meal Timing',          text: 'Eat every 3–4 hours to maintain stable blood sugar and sustained energy.' },
  { title: 'Protein First',        text: 'Starting meals with protein helps you feel fuller and reduces overall intake.' },
  { title: 'Fibre Matters',        text: 'Aim for 25–38 g of fibre per day to support gut health and satiety.' },
  { title: 'Healthy Fats',         text: 'Avocados, nuts and olive oil support brain function and hormone production.' },
  { title: 'Don\'t Skip Breakfast',text: 'A nutritious breakfast kickstarts metabolism and improves focus.' },
  { title: 'Mindful Eating',       text: 'Eating slowly and without distractions helps you recognise fullness cues.' },
  { title: 'Colour Your Plate',    text: 'Aim for 5 different coloured vegetables/fruits daily for micronutrient variety.' },
  { title: 'Limit Processed Foods',text: 'Whole foods have more nutrients and less added sugar/sodium than processed options.' },
  { title: 'Pre-Workout Fuel',     text: 'Eat carbs + protein 1–2 h before exercise for best performance.' },
  { title: 'Post-Workout Recovery',text: 'Consume protein within 30–60 min after training to support muscle repair.' },
];

// Seeds rotation by day so same tips show all day, change next day (Fix #13)
const getTodaysTips = (count = 3): typeof ALL_TIPS => {
  const dayIndex = Math.floor(Date.now() / 86400000); // changes daily
  const start    = (dayIndex * count) % ALL_TIPS.length;
  const result   = [];
  for (let i = 0; i < count; i++) result.push(ALL_TIPS[(start + i) % ALL_TIPS.length]);
  return result;
};

// ─── Warning thresholds — Fix #12 ────────────────────────────────────────────
const WARN_WATER_ML  = 5000; // 5 L — excessive
const WARN_CAL_MULTI = 2.5;  // 2.5× goal = very excessive

// ─── Main ─────────────────────────────────────────────────────────────────────
const NutritionTracker: React.FC = () => {
  const [logs, setLogs]               = useState<NutritionLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [currentLog, setCurrentLog]   = useState<NutritionLog | null>(null);
  const [activeMeal, setActiveMeal]   = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goals, setGoals]             = useState<NutritionGoals>(getGoals());
  // Fix #10: water as text input
  const [waterInput, setWaterInput]   = useState('');
  const [waterErr, setWaterErr]       = useState('');
  const todaysTips                    = getTodaysTips(3);

  useEffect(() => {
    const stored   = storage.getNutrition();
    setLogs(stored);
    const existing = stored.find((l: NutritionLog) => l.date === selectedDate);
    setCurrentLog(existing || makeEmptyLog(selectedDate));
  }, [selectedDate]);

  const makeEmptyLog = (date: string): NutritionLog => ({
    id: Date.now().toString(), date,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    water: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
  });

  const calcTotals = (log: NutritionLog): NutritionLog => {
    const all = [...log.meals.breakfast, ...log.meals.lunch, ...log.meals.dinner, ...log.meals.snacks];
    return {
      ...log,
      totalCalories: all.reduce((s, f) => s + f.calories, 0),
      totalProtein:  all.reduce((s, f) => s + f.protein, 0),
      totalCarbs:    all.reduce((s, f) => s + f.carbs, 0),
      totalFat:      all.reduce((s, f) => s + f.fat, 0),
    };
  };

  const saveLog = async (log: NutritionLog) => {
    const calculated = calcTotals(log);
    await storage.saveNutritionLog(calculated);
    setLogs(storage.getNutrition());
    setCurrentLog(calculated);
  };

  const addFood = async (food: FoodEntry) => {
    if (!currentLog) return;
    await saveLog({ ...currentLog, meals: { ...currentLog.meals, [activeMeal]: [...currentLog.meals[activeMeal], food] } });
    setIsAddingFood(false);
  };

  const removeFood = async (meal: keyof NutritionLog['meals'], idx: number) => {
    if (!currentLog) return;
    await saveLog({ ...currentLog, meals: { ...currentLog.meals, [meal]: currentLog.meals[meal].filter((_, i) => i !== idx) } });
  };

  // Fix #10: water as typed text in ml
  const handleWaterAdd = async () => {
    setWaterErr('');
    const ml = parseFloat(waterInput);
    if (isNaN(ml) || ml <= 0) { setWaterErr('Enter a valid amount in ml'); return; }
    // Fix #11: cap at 10 L total
    if (!currentLog) return;
    const newTotal = currentLog.water + ml;
    if (newTotal > 10000) { setWaterErr('Total water cannot exceed 10,000 ml (10 L)'); return; }
    await saveLog({ ...currentLog, water: Math.round(newTotal) });
    setWaterInput('');
  };

  const handleGoalSave = (g: NutritionGoals) => {
    saveGoals(g);
    setGoals(g);
    setShowGoalEditor(false);
  };

  // ── Warnings Fix #12 ─────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (currentLog) {
    if (currentLog.water >= WARN_WATER_ML)
      warnings.push(`⚠️ You've logged ${currentLog.water} ml of water today. Drinking over 5 L can be harmful — please consult a doctor if intentional.`);
    if (currentLog.totalCalories >= goals.calories * WARN_CAL_MULTI)
      warnings.push(`⚠️ You've logged ${currentLog.totalCalories.toLocaleString()} kcal — more than 2.5× your daily goal. Make sure the entries are correct.`);
    if (currentLog.totalProtein > 400)
      warnings.push(`⚠️ Protein logged (${Math.round(currentLog.totalProtein)} g) seems very high. Verify your entries.`);
  }

  if (isAddingFood) {
    return <FoodSelector onSelect={addFood} onCancel={() => setIsAddingFood(false)} mealType={activeMeal} goals={goals} />;
  }
  if (showGoalEditor) {
    return <GoalEditor goals={goals} onSave={handleGoalSave} onCancel={() => setShowGoalEditor(false)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nutrition Tracker</h1>
          <p className="text-gray-600 mt-2">Monitor your daily nutrition and caloric intake</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Fix #14: goal editor button */}
          <button onClick={() => setShowGoalEditor(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm">
            <Settings className="w-4 h-4" />Set Goals
          </button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            max={formatDate(new Date())}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
      </div>

      {/* Warnings — Fix #12 */}
      {warnings.map((w, i) => (
        <div key={i} className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{w}</p>
        </div>
      ))}

      {currentLog && (
        <>
          {/* Macro cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <MacroCard title="Calories" current={currentLog.totalCalories} target={goals.calories} unit="kcal" color="bg-orange-500" />
            <MacroCard title="Protein"  current={currentLog.totalProtein}  target={goals.protein}  unit="g"    color="bg-red-500" />
            <MacroCard title="Carbs"    current={currentLog.totalCarbs}    target={goals.carbs}    unit="g"    color="bg-blue-500" />
            <MacroCard title="Fat"      current={currentLog.totalFat}      target={goals.fat}      unit="g"    color="bg-yellow-500" />

            {/* Fix #10: water text input card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Water</p>
                  <p className="text-2xl font-bold text-gray-900">{currentLog.water} ml</p>
                  <p className="text-xs text-gray-500">goal: {goals.water} ml</p>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500"><Droplets className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text" inputMode="decimal"
                  placeholder="Amount in ml"
                  value={waterInput}
                  onChange={e => { setWaterInput(e.target.value); setWaterErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleWaterAdd(); } }}
                  className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <button onClick={handleWaterAdd}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors font-medium">
                  Add
                </button>
              </div>
              {waterErr && <p className="text-xs text-red-500 mt-1">{waterErr}</p>}
              {/* Quick add buttons */}
              <div className="flex gap-1 mt-2">
                {[250, 500, 750].map(ml => (
                  <button key={ml} onClick={async () => {
                    if (!currentLog) return;
                    const newTotal = currentLog.water + ml;
                    if (newTotal > 10000) { setWaterErr('Would exceed 10 L limit'); return; }
                    await saveLog({ ...currentLog, water: newTotal });
                  }} className="flex-1 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded border border-cyan-200 transition-colors">
                    +{ml}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Meal tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(meal => (
                  <button key={meal} onClick={() => setActiveMeal(meal)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm capitalize whitespace-nowrap transition-colors duration-200 ${
                      activeMeal === meal ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    {meal}
                    {currentLog.meals[meal].length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                        {currentLog.meals[meal].length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{activeMeal}</h3>
                <button onClick={() => setIsAddingFood(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200">
                  <Plus className="w-4 h-4" /><span>Add Food</span>
                </button>
              </div>
              <div className="space-y-3">
                {currentLog.meals[activeMeal].length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No foods logged for {activeMeal}</p>
                    <button onClick={() => setIsAddingFood(true)} className="mt-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                      Add your first food
                    </button>
                  </div>
                ) : (
                  currentLog.meals[activeMeal].map((food, i) => (
                    <FoodItem key={i} food={food} onRemove={() => removeFood(activeMeal, i)} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Progress + Rotating tips */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Progress</h3>
              <div className="space-y-4">
                <ProgressBar label="Calories" current={currentLog.totalCalories} target={goals.calories} color="bg-orange-500" unit="kcal" />
                <ProgressBar label="Protein"  current={currentLog.totalProtein}  target={goals.protein}  color="bg-red-500"    unit="g" />
                <ProgressBar label="Carbs"    current={currentLog.totalCarbs}    target={goals.carbs}    color="bg-blue-500"   unit="g" />
                <ProgressBar label="Fat"      current={currentLog.totalFat}      target={goals.fat}      color="bg-yellow-500" unit="g" />
                <ProgressBar label="Water"    current={currentLog.water}         target={goals.water}    color="bg-cyan-500"   unit="ml" />
              </div>
            </div>

            {/* Fix #13: rotating tips */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nutrition Tips</h3>
                <span className="text-xs text-gray-400">Refreshes daily</span>
              </div>
              <div className="space-y-3">
                {todaysTips.map((tip, i) => {
                  const colors = ['blue', 'green', 'purple'];
                  const c = colors[i % colors.length];
                  return (
                    <div key={i} className={`p-4 bg-${c}-50 rounded-lg`}>
                      <h4 className={`font-medium text-${c}-800 mb-1`}>{tip.title}</h4>
                      <p className={`text-sm text-${c}-700`}>{tip.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── GoalEditor — Fix #14 ─────────────────────────────────────────────────────
const GoalEditor: React.FC<{ goals: NutritionGoals; onSave: (g: NutritionGoals) => void; onCancel: () => void }> =
  ({ goals, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...goals });
  const cls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Set Nutrition Goals</h2>
            <p className="text-gray-500 text-sm mt-1">Personalise your daily targets</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="space-y-5">
          {[
            { key: 'calories', label: 'Daily Calories',  unit: 'kcal', min: 500,  max: 10000, tip: 'Typical range: 1,500–3,000 kcal' },
            { key: 'protein',  label: 'Protein Goal',    unit: 'g',    min: 10,   max: 500,   tip: 'Typical: 0.8–2.2 g per kg bodyweight' },
            { key: 'carbs',    label: 'Carbs Goal',      unit: 'g',    min: 20,   max: 1000,  tip: 'Typical: 45–65% of total calories' },
            { key: 'fat',      label: 'Fat Goal',        unit: 'g',    min: 10,   max: 300,   tip: 'Typical: 20–35% of total calories' },
            { key: 'water',    label: 'Water Intake',    unit: 'ml',   min: 500,  max: 8000,  tip: 'Recommended: 2,000–3,000 ml daily' },
          ].map(({ key, label, unit, min, max, tip }) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">{label} ({unit})</label>
                <span className="text-xs text-gray-400">{tip}</span>
              </div>
              <NumericInput
                value={(form as any)[key]} min={min} max={max}
                onChange={v => setForm(p => ({ ...p, [key]: v }))}
                placeholder={String((goals as any)[key])}
                className={cls}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => onSave(form)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" />Save Goals
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MacroCard ────────────────────────────────────────────────────────────────
const MacroCard: React.FC<{ title: string; current: number; target: number; unit: string; color: string }> =
  ({ title, current, target, unit, color }) => {
  const pct = Math.min((current / target) * 100, 100);
  // Fix #11: cap display at 999% visually, warn via color
  const over = current > target * 1.5;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${over ? 'text-red-600' : 'text-gray-900'}`}>
            {Math.round(current)}{unit}
          </p>
          <p className="text-xs text-gray-500">of {target}{unit}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}><Target className="w-6 h-6 text-white" /></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${over ? 'bg-red-500' : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {over && <p className="text-xs text-red-500 mt-1">Over target</p>}
    </div>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ label: string; current: number; target: number; color: string; unit: string }> =
  ({ label, current, target, color, unit }) => {
  const pct  = Math.min((current / target) * 100, 100);
  const over = current > target;
  return (
    <div>
      <div className="flex justify-between text-sm font-medium mb-1">
        <span className="text-gray-700">{label}</span>
        <span className={over ? 'text-red-600' : 'text-gray-600'}>
          {Math.round(current)} / {target} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${over ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── FoodItem ─────────────────────────────────────────────────────────────────
const FoodItem: React.FC<{ food: FoodEntry; onRemove: () => void }> = ({ food, onRemove }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <h4 className="font-medium text-gray-900">{food.foodName}</h4>
      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
        <span className="font-medium text-orange-600">{Math.round(food.calories)} kcal</span>
        <span>{Math.round(food.protein)}g protein</span>
        <span>{Math.round(food.carbs)}g carbs</span>
        <span>{Math.round(food.fat)}g fat</span>
        <span className="text-gray-400">×{food.quantity}</span>
      </div>
    </div>
    <button onClick={onRemove} className="ml-3 text-gray-400 hover:text-red-500 transition-colors">
      <X className="w-5 h-5" />
    </button>
  </div>
);

// ─── FoodSelector ─────────────────────────────────────────────────────────────
const FoodSelector: React.FC<{
  onSelect: (f: FoodEntry) => void;
  onCancel: () => void;
  mealType: string;
  goals: NutritionGoals;
}> = ({ onSelect, onCancel, mealType, goals }) => {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<typeof foods[0] | null>(null);
  const [qty, setQty]           = useState(1);

  const filtered = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  // Fix #11: warn if adding this food would exceed 3× calorie goal
  const wouldExceed = selected && (selected.caloriesPerUnit * qty) > goals.calories * 3;

  const handleAdd = () => {
    if (!selected) return;
    // Fix #11: hard cap — single entry cannot exceed 5× calorie goal
    const maxCal = goals.calories * 5;
    if (selected.caloriesPerUnit * qty > maxCal) {
      alert(`That entry would be ${Math.round(selected.caloriesPerUnit * qty).toLocaleString()} kcal — please check the quantity.`);
      return;
    }
    onSelect({
      foodId: selected.id, foodName: selected.name, quantity: qty,
      calories: Math.round(selected.caloriesPerUnit * qty),
      protein:  Math.round(selected.protein * qty * 10) / 10,
      carbs:    Math.round(selected.carbs   * qty * 10) / 10,
      fat:      Math.round(selected.fat     * qty * 10) / 10,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">Add to {mealType}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search foods…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Foods</h3>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0
                ? <p className="text-sm text-gray-400 py-4 text-center">No foods found</p>
                : filtered.map(food => (
                  <button key={food.id} onClick={() => setSelected(food)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 ${
                      selected?.id === food.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <div className="font-medium text-gray-900">{food.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{food.caloriesPerUnit} kcal per {food.unit}</div>
                  </button>
                ))
              }
            </div>
          </div>

          {selected && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Nutrition Info</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
                <p className="font-medium text-gray-900 mb-2">{selected.name} × {qty}</p>
                <p className="text-orange-600 font-semibold">{Math.round(selected.caloriesPerUnit * qty)} kcal</p>
                <p>Protein: {Math.round(selected.protein * qty)}g</p>
                <p>Carbs:   {Math.round(selected.carbs   * qty)}g</p>
                <p>Fat:     {Math.round(selected.fat     * qty)}g</p>
              </div>

              {/* Fix #11 warning */}
              {wouldExceed && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">This entry is very high in calories. Please check the quantity is correct.</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity ({selected.unit})</label>
                {/* Fix #16 */}
                <NumericInput value={qty} min={0.1} step={0.1}
                  onChange={v => setQty(v)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="1" />
              </div>
              <div className="flex space-x-3">
                <button onClick={onCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleAdd}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">Add Food</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionTracker;
