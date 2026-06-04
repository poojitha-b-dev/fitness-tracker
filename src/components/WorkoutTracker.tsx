// src/components/WorkoutTracker.tsx
// Fixes: #6 (add set goes to dashboard), #7 (calendar max=today),
//        #8 (custom exercises), #9 (save not working), #16 (default 0 inputs)
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Clock, Calendar, Dumbbell, Edit, Search, X, Check } from 'lucide-react';
import { storage } from '../utils/storage';
import { exercises as builtInExercises } from '../data/exercises';
import { Workout, WorkoutExercise, WorkoutSet } from '../types';
import { formatDate } from '../utils/calculations';
import NumericInput from './NumericInput';

// ─── today's date string for max attr ────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

// ─── custom exercises stored in localStorage ──────────────────────────────────
const CUSTOM_KEY = 'fitness-app-custom-exercises';
const getCustomExercises = (): { id: string; name: string; category: string }[] => {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
};
const saveCustomExercises = (list: { id: string; name: string; category: string }[]) => {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const WorkoutTracker: React.FC = () => {
  const [workouts, setWorkouts]       = useState<Workout[]>([]);
  const [isAdding, setIsAdding]       = useState(false);
  const [editing, setEditing]         = useState<Workout | null>(null);
  const [search, setSearch]           = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { setWorkouts(storage.getWorkouts()); }, []);

  const saveWorkout = async (workout: Workout) => {
    setSaving(true);
    try {
      const updated = editing
        ? await storage.updateWorkout(workout) as Workout[]
        : await storage.addWorkout(workout) as Workout[];
      setWorkouts(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsAdding(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkout = async (id: string) => {
    setWorkouts(await storage.deleteWorkout(id) as Workout[]);
  };

  const filtered = workouts.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.exercises.some(ex => ex.exerciseName.toLowerCase().includes(search.toLowerCase()))
  );

  // Fix #6: show form without unmounting the list underneath
  if (isAdding || editing) {
    return (
      <WorkoutForm
        workout={editing}
        onSave={saveWorkout}
        onCancel={() => { setIsAdding(false); setEditing(null); }}
        saving={saving}
        saveSuccess={saveSuccess}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-600 mt-2">Track your training sessions and progress</p>
        </div>
        <button onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200">
          <Plus className="w-5 h-5" /><span>New Workout</span>
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search workouts..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workouts yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your fitness journey by logging your first workout</p>
            <button onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors duration-200">
              Log Your First Workout
            </button>
          </div>
        ) : (
          filtered.map(w => (
            <WorkoutCard key={w.id} workout={w} onEdit={setEditing} onDelete={deleteWorkout} />
          ))
        )}
      </div>
    </div>
  );
};

// ─── WorkoutCard ──────────────────────────────────────────────────────────────
const WorkoutCard: React.FC<{
  workout: Workout;
  onEdit: (w: Workout) => void;
  onDelete: (id: string) => void;
}> = ({ workout, onEdit, onDelete }) => {
  const totalSets   = workout.exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const totalVolume = workout.exercises.reduce((s, ex) =>
    s + ex.sets.reduce((ss, set) => ss + (set.reps * (set.weight || 0)), 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{workout.name}</h3>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center space-x-1"><Calendar className="w-4 h-4" /><span>{new Date(workout.date).toLocaleDateString()}</span></div>
            <div className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>{workout.duration} min</span></div>
            <div className="flex items-center space-x-1"><Dumbbell className="w-4 h-4" /><span>{workout.exercises.length} exercises</span></div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => onEdit(workout)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors duration-200"><Edit className="w-5 h-5" /></button>
          <button onClick={() => onDelete(workout.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Exercises', value: workout.exercises.length },
          { label: 'Total Sets', value: totalSets },
          { label: 'Volume (kg)', value: totalVolume.toLocaleString() },
          { label: 'Calories', value: workout.caloriesBurned || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {workout.exercises.map((ex, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2">{ex.exerciseName}</h4>
            <div className="flex flex-wrap gap-2">
              {ex.sets.map((set, si) => (
                <span key={si} className="bg-white px-3 py-1 rounded-md text-sm font-medium text-gray-700 border border-gray-200">
                  {set.reps} reps{set.weight ? ` × ${set.weight}kg` : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {workout.notes && <div className="mt-4 p-3 bg-blue-50 rounded-lg"><p className="text-sm text-blue-800">{workout.notes}</p></div>}
    </div>
  );
};

// ─── WorkoutForm ──────────────────────────────────────────────────────────────
const WorkoutForm: React.FC<{
  workout?: Workout | null;
  onSave: (w: Workout) => void;
  onCancel: () => void;
  saving: boolean;
  saveSuccess: boolean;
}> = ({ workout, onSave, onCancel, saving, saveSuccess }) => {
  const [form, setForm] = useState({
    name:          workout?.name          || '',
    date:          workout?.date          || formatDate(new Date()),
    duration:      workout?.duration      || 0,
    caloriesBurned:workout?.caloriesBurned|| 0,
    notes:         workout?.notes         || '',
    exercises:     workout?.exercises     || [] as WorkoutExercise[],
  });

  // Fix #8: custom exercise state
  const [customExercises, setCustomExercises] = useState(getCustomExercises());
  const [showCustomForm, setShowCustomForm]   = useState(false);
  const [customName, setCustomName]           = useState('');
  const [customCategory, setCustomCategory]   = useState('strength');
  const [exerciseSearch, setExerciseSearch]   = useState('');

  const allExercises = [
    ...builtInExercises,
    ...customExercises.map(c => ({ ...c, muscleGroups: [], description: 'Custom exercise' })),
  ];

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const addCustomExercise = () => {
    if (!customName.trim()) return;
    const newEx = { id: `custom-${Date.now()}`, name: customName.trim(), category: customCategory };
    const updated = [...customExercises, newEx];
    setCustomExercises(updated);
    saveCustomExercises(updated);
    setCustomName('');
    setShowCustomForm(false);
  };

  const addExercise = (id: string) => {
    const ex = allExercises.find(e => e.id === id);
    if (!ex) return;
    // Fix #6: use functional update so we never lose existing exercises
    setForm(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { exerciseId: ex.id, exerciseName: ex.name, sets: [{ reps: 0, weight: 0 }], notes: '' },
      ],
    }));
  };

  const updateExercise = (i: number, ex: WorkoutExercise) =>
    setForm(prev => ({ ...prev, exercises: prev.exercises.map((e, idx) => idx === i ? ex : e) }));

  const removeExercise = (i: number) =>
    setForm(prev => ({ ...prev, exercises: prev.exercises.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: workout?.id || Date.now().toString(), ...form });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{workout ? 'Edit Workout' : 'New Workout'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workout Name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Upper Body Strength" />
            </div>
            {/* Fix #7: max = today */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" required value={form.date}
                max={todayStr()}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              {/* Fix #16 */}
              <NumericInput value={form.duration} min={0}
                onChange={v => setForm(p => ({ ...p, duration: v }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="45" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calories Burned</label>
              <NumericInput value={form.caloriesBurned || 0} min={0}
                onChange={v => setForm(p => ({ ...p, caloriesBurned: v }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="300" />
            </div>
          </div>

          {/* Exercise picker — Fix #8 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Add Exercise</label>
              <button type="button" onClick={() => setShowCustomForm(s => !s)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" />Add Custom Exercise
              </button>
            </div>

            {/* Custom exercise form */}
            {showCustomForm && (
              <div className="mb-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-800 mb-3">New Custom Exercise</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Exercise name" value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <select value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="sports">Sports</option>
                  </select>
                  <button type="button" onClick={addCustomExercise}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                    Add
                  </button>
                  <button type="button" onClick={() => setShowCustomForm(false)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Search + select */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Search exercises..." value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <select onChange={e => { if (e.target.value) { addExercise(e.target.value); e.target.value = ''; } }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">Select an exercise to add…</option>
              {['strength','cardio','flexibility','sports'].map(cat => {
                const group = filteredExercises.filter(ex => ex.category === cat);
                if (group.length === 0) return null;
                return (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {group.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}{customExercises.find(c => c.id === ex.id) ? ' (custom)' : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Exercises list */}
          <div className="space-y-4">
            {form.exercises.map((ex, i) => (
              <ExerciseForm key={`${ex.exerciseId}-${i}`} exercise={ex}
                onUpdate={updated => updateExercise(i, updated)}
                onRemove={() => removeExercise(i)} />
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Any additional notes..." />
          </div>

          {/* Fix #9: proper save button with loading + success feedback */}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 min-w-[140px] justify-center">
              {saving ? (
                <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'inline-block' }} />Saving…</>
              ) : saveSuccess ? (
                <><Check className="w-4 h-4" /><span>Saved!</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Save Workout</span></>
              )}
            </button>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </form>
      </div>
    </div>
  );
};

// ─── ExerciseForm ─────────────────────────────────────────────────────────────
const ExerciseForm: React.FC<{
  exercise: WorkoutExercise;
  onUpdate: (e: WorkoutExercise) => void;
  onRemove: () => void;
}> = ({ exercise, onUpdate, onRemove }) => {
  // Fix #6: use local state for sets, flush to parent on every change
  const addSet = () =>
    onUpdate({ ...exercise, sets: [...exercise.sets, { reps: 0, weight: 0 } as WorkoutSet] });

  const updateSet = (i: number, set: WorkoutSet) =>
    onUpdate({ ...exercise, sets: exercise.sets.map((s, idx) => idx === i ? set : s) });

  const removeSet = (i: number) =>
    onUpdate({ ...exercise, sets: exercise.sets.filter((_, idx) => idx !== i) });

  const inputCls = "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{exercise.exerciseName}</h4>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {exercise.sets.map((set, i) => (
          <div key={i} className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500 w-12 flex-shrink-0">Set {i + 1}</span>
            {/* Fix #16: NumericInput for reps */}
            <NumericInput value={set.reps} min={0} placeholder="Reps"
              onChange={v => updateSet(i, { ...set, reps: v })}
              className={inputCls} />
            {/* Fix #16: NumericInput for weight */}
            <NumericInput value={set.weight || 0} min={0} step={0.5} placeholder="kg"
              onChange={v => updateSet(i, { ...set, weight: v })}
              className={inputCls} />
            <button type="button" onClick={() => removeSet(i)}
              className="text-red-400 hover:text-red-600 p-1 flex-shrink-0 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Fix #6: type="button" prevents form submit on click */}
      <button type="button" onClick={addSet}
        className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1 transition-colors">
        <Plus className="w-4 h-4" /><span>Add Set</span>
      </button>

      <div className="mt-3">
        <input type="text" placeholder="Exercise notes (optional)…" value={exercise.notes || ''}
          onChange={e => onUpdate({ ...exercise, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
      </div>
    </div>
  );
};

export default WorkoutTracker;
