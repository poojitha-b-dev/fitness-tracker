// src/components/WorkoutTracker.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Clock, Calendar, Dumbbell, Edit, Search } from 'lucide-react';
import { storage } from '../utils/storage';
import { exercises } from '../data/exercises';
import { Workout, WorkoutExercise, WorkoutSet } from '../types';
import { formatDate } from '../utils/calculations';

const WorkoutTracker: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { setWorkouts(storage.getWorkouts()); }, []);

  const saveWorkout = async (workout: Workout) => {
    const updated = editing
      ? await storage.updateWorkout(workout) as Workout[]
      : await storage.addWorkout(workout) as Workout[];
    setWorkouts(updated);
    setIsAdding(false);
    setEditing(null);
  };

  const deleteWorkout = async (id: string) => {
    setWorkouts(await storage.deleteWorkout(id) as Workout[]);
  };

  const filtered = workouts.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.exercises.some(ex => ex.exerciseName.toLowerCase().includes(search.toLowerCase()))
  );

  if (isAdding || editing) {
    return (
      <WorkoutForm
        workout={editing}
        onSave={saveWorkout}
        onCancel={() => { setIsAdding(false); setEditing(null); }}
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
        <input type="text" placeholder="Search workouts..." value={search} onChange={e => setSearch(e.target.value)}
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

const WorkoutCard: React.FC<{ workout: Workout; onEdit: (w: Workout) => void; onDelete: (id: string) => void }> =
  ({ workout, onEdit, onDelete }) => {
  const totalSets   = workout.exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const totalVolume = workout.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + (set.reps * (set.weight || 0)), 0), 0);
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
                <span key={si} className="bg-white px-3 py-1 rounded-md text-sm font-medium text-gray-700">
                  {set.reps} reps {set.weight ? `× ${set.weight}kg` : ''}
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

const WorkoutForm: React.FC<{ workout?: Workout | null; onSave: (w: Workout) => void; onCancel: () => void }> =
  ({ workout, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: workout?.name || '',
    date: workout?.date || formatDate(new Date()),
    duration: workout?.duration || 0,
    caloriesBurned: workout?.caloriesBurned || 0,
    notes: workout?.notes || '',
    exercises: workout?.exercises || [] as WorkoutExercise[],
  });

  const addExercise = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    if (ex) setForm(p => ({ ...p, exercises: [...p.exercises, { exerciseId: ex.id, exerciseName: ex.name, sets: [{ reps: 0, weight: 0 }], notes: '' }] }));
  };
  const updateExercise = (i: number, ex: WorkoutExercise) => setForm(p => ({ ...p, exercises: p.exercises.map((e, idx) => idx === i ? ex : e) }));
  const removeExercise = (i: number) => setForm(p => ({ ...p, exercises: p.exercises.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: workout?.id || Date.now().toString(), ...form });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{workout ? 'Edit Workout' : 'New Workout'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workout Name</label>
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Upper Body Strength" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              <input type="number" min="0" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calories Burned</label>
              <input type="number" min="0" value={form.caloriesBurned} onChange={e => setForm(p => ({ ...p, caloriesBurned: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Exercise</label>
            <select onChange={e => { if (e.target.value) { addExercise(e.target.value); e.target.value = ''; } }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">Select an exercise...</option>
              {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>)}
            </select>
          </div>
          <div className="space-y-4">
            {form.exercises.map((ex, i) => (
              <ExerciseForm key={i} exercise={ex}
                onUpdate={updated => updateExercise(i, updated)}
                onRemove={() => removeExercise(i)} />
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Any additional notes..." />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2">
              <Save className="w-4 h-4" /><span>Save Workout</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ExerciseForm: React.FC<{ exercise: WorkoutExercise; onUpdate: (e: WorkoutExercise) => void; onRemove: () => void }> =
  ({ exercise, onUpdate, onRemove }) => {
  const addSet = () => onUpdate({ ...exercise, sets: [...exercise.sets, { reps: 0, weight: 0 } as WorkoutSet] });
  const updateSet = (i: number, set: WorkoutSet) => onUpdate({ ...exercise, sets: exercise.sets.map((s, idx) => idx === i ? set : s) });
  const removeSet = (i: number) => onUpdate({ ...exercise, sets: exercise.sets.filter((_, idx) => idx !== i) });
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{exercise.exerciseName}</h4>
        <button onClick={onRemove} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        {exercise.sets.map((set, i) => (
          <div key={i} className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500 w-12">Set {i + 1}</span>
            <input type="number" placeholder="Reps" value={set.reps || ''}
              onChange={e => updateSet(i, { ...set, reps: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <input type="number" placeholder="Weight (kg)" value={set.weight || ''}
              onChange={e => updateSet(i, { ...set, weight: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <button onClick={() => removeSet(i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={addSet} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1">
          <Plus className="w-4 h-4" /><span>Add Set</span>
        </button>
      </div>
      <div className="mt-3">
        <input type="text" placeholder="Exercise notes..." value={exercise.notes || ''}
          onChange={e => onUpdate({ ...exercise, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
      </div>
    </div>
  );
};

export default WorkoutTracker;
