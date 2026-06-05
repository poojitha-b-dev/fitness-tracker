// src/components/Goals.tsx
// Fix #17: description is now optional
import React, { useState, useEffect } from 'react';
import {
  Plus, Target, Calendar, TrendingUp, CheckCircle,
  Circle, Edit, Trash2, Flag, Award, Clock, X,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { Goal } from '../types';
import { formatDate } from '../utils/calculations';
import NumericInput from './NumericInput';

const Goals: React.FC = () => {
  const [goals, setGoals]         = useState<Goal[]>([]);
  const [isAdding, setIsAdding]   = useState(false);
  const [editing, setEditing]     = useState<Goal | null>(null);
  const [filter, setFilter]       = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => { setGoals(storage.getGoals()); }, []);

  const saveGoal = async (goal: Goal) => {
    const updated = editing
      ? await storage.updateGoal(goal) as Goal[]
      : await storage.addGoal(goal) as Goal[];
    setGoals(updated);
    setIsAdding(false);
    setEditing(null);
  };

  const deleteGoal            = async (id: string)              => setGoals(await storage.deleteGoal(id) as Goal[]);
  const toggleGoalCompletion  = async (id: string)              => {
    const g = goals.find(g => g.id === id); if (!g) return;
    setGoals(await storage.updateGoal({ ...g, completed: !g.completed }) as Goal[]);
  };
  const updateGoalProgress    = async (id: string, current: number) => {
    const g = goals.find(g => g.id === id); if (!g) return;
    setGoals(await storage.updateGoal({ ...g, current }) as Goal[]);
  };

  const filteredGoals = goals.filter(g =>
    filter === 'active' ? !g.completed : filter === 'completed' ? g.completed : true
  );
  const stats = {
    total:     goals.length,
    completed: goals.filter(g => g.completed).length,
    active:    goals.filter(g => !g.completed).length,
    overdue:   goals.filter(g => !g.completed && new Date(g.deadline) < new Date()).length,
  };

  if (isAdding || editing) {
    return (
      <GoalForm
        goal={editing}
        onSave={saveGoal}
        onCancel={() => { setIsAdding(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-2">Set and track your fitness objectives</p>
        </div>
        <button onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200">
          <Plus className="w-5 h-5" /><span>New Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Target}      title="Total Goals" value={stats.total}     color="bg-blue-500" />
        <StatCard icon={CheckCircle} title="Completed"   value={stats.completed} color="bg-green-500" />
        <StatCard icon={TrendingUp}  title="Active"      value={stats.active}    color="bg-orange-500" />
        <StatCard icon={Clock}       title="Overdue"     value={stats.overdue}   color="bg-red-500" />
      </div>

      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 capitalize ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>{f}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No goals set' : `No ${filter} goals`}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' ? 'Start by setting your first fitness goal' : `No ${filter} goals at the moment`}
            </p>
            {filter === 'all' && (
              <button onClick={() => setIsAdding(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors">
                Set Your First Goal
              </button>
            )}
          </div>
        ) : (
          filteredGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal}
              onEdit={setEditing}
              onDelete={deleteGoal}
              onToggleComplete={toggleGoalCompletion}
              onUpdateProgress={updateGoalProgress}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ComponentType<any>; title: string; value: number; color: string }> =
  ({ icon: Icon, title, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6 text-white" /></div>
    </div>
  </div>
);

// ─── GoalCard ─────────────────────────────────────────────────────────────────
const GoalCard: React.FC<{
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateProgress: (id: string, v: number) => void;
}> = ({ goal, onEdit, onDelete, onToggleComplete, onUpdateProgress }) => {
  const [isUpdating, setIsUpdating]   = useState(false);
  const [progressValue, setProgressValue] = useState(goal.current);
  const progress  = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
  const isOverdue = !goal.completed && new Date(goal.deadline) < new Date();
  const daysLeft  = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000);

  const priorityColor = (p: string) =>
    p === 'high' ? 'text-red-600 bg-red-100' : p === 'medium' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100';
  const TypeIcon = goal.type === 'strength' ? Award : goal.type === 'endurance' ? TrendingUp : goal.type === 'custom' ? Flag : Target;

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${
      goal.completed ? 'border-green-200 bg-green-50' : isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <button onClick={() => onToggleComplete(goal.id)}
            className={`mt-1 flex-shrink-0 transition-colors ${goal.completed ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}>
            {goal.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <TypeIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <h3 className={`text-lg font-semibold ${goal.completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                {goal.title}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${priorityColor(goal.priority || 'medium')}`}>
                {goal.priority || 'medium'}
              </span>
            </div>
            {/* Fix #17: description may be empty */}
            {goal.description && <p className="text-gray-600 mb-3 text-sm">{goal.description}</p>}

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {goal.current} / {goal.target} {goal.unit}
                </span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all duration-300 ${goal.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{new Date(goal.deadline).toLocaleDateString()}</span></div>
              {!goal.completed && (
                <span className={`font-medium ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
          {!goal.completed && (
            <button onClick={() => setIsUpdating(s => !s)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Update progress">
              <TrendingUp className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onEdit(goal)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDelete(goal.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {isUpdating && (
        <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="font-medium text-blue-800 text-sm mb-3">Update Progress</p>
          <div className="flex items-center gap-3">
            <NumericInput value={progressValue} min={0} max={goal.target * 10}
              onChange={setProgressValue}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <span className="text-sm text-gray-600 flex-shrink-0">/ {goal.target} {goal.unit}</span>
            <button onClick={() => { onUpdateProgress(goal.id, progressValue); setIsUpdating(false); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">Save</button>
            <button onClick={() => setIsUpdating(false)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GoalForm ─────────────────────────────────────────────────────────────────
const GoalForm: React.FC<{ goal?: Goal | null; onSave: (g: Goal) => void; onCancel: () => void }> =
  ({ goal, onSave, onCancel }) => {
  const goalTypes = [
    { value: 'weight',    label: 'Weight',    units: ['kg','lbs'] },
    { value: 'strength',  label: 'Strength',  units: ['kg','lbs','reps'] },
    { value: 'endurance', label: 'Endurance', units: ['km','miles','minutes'] },
    { value: 'nutrition', label: 'Nutrition', units: ['calories','grams','servings'] },
    { value: 'custom',    label: 'Custom',    units: ['units','times','days'] },
  ];

  const [form, setForm] = useState({
    type:        (goal?.type     || 'weight') as Goal['type'],
    title:        goal?.title       || '',
    description:  goal?.description || '',        // Fix #17: optional, default empty
    target:       goal?.target      || 0,
    current:      goal?.current     || 0,
    unit:         goal?.unit        || 'kg',
    deadline:     goal?.deadline    || formatDate(new Date(Date.now() + 30 * 86400000)),
    priority:    (goal?.priority   || 'medium') as 'low' | 'medium' | 'high',
  });

  const selectedType = goalTypes.find(t => t.value === form.type);
  const cls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: goal?.id || Date.now().toString(), ...form, completed: goal?.completed || false } as Goal);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{goal ? 'Edit Goal' : 'Create New Goal'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal Type</label>
              <select value={form.type} className={cls}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as Goal['type'], unit: goalTypes.find(t => t.value === e.target.value)?.units[0] || '' }))}>
                {goalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select value={form.priority} className={cls}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as 'low'|'medium'|'high' }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title <span className="text-red-500">*</span></label>
            <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className={cls} placeholder="e.g., Lose 10 kg in 3 months" />
          </div>

          {/* Fix #17: description is optional — no required attr */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} className={cls} placeholder="Add more detail about your goal… (optional)" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Value <span className="text-red-500">*</span></label>
              <NumericInput value={form.target} min={0} step={0.1}
                onChange={v => setForm(p => ({ ...p, target: v }))} className={cls} placeholder="10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Progress</label>
              <NumericInput value={form.current} min={0} step={0.1}
                onChange={v => setForm(p => ({ ...p, current: v }))} className={cls} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <select value={form.unit} className={cls}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {selectedType?.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline <span className="text-red-500">*</span></label>
            <input type="date" required value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className={cls} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
              {goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Goals;
