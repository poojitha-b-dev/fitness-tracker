// src/components/Goals.tsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Target, Calendar, TrendingUp, CheckCircle,
  Circle, Edit, Trash2, Flag, Award, Clock
} from 'lucide-react';
import { storage } from '../utils/storage';
import { Goal } from '../types';
import { formatDate } from '../utils/calculations';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => { setGoals(storage.getGoals()); }, []);

  const saveGoal = async (goal: Goal) => {
    const updated = editingGoal
      ? await storage.updateGoal(goal) as Goal[]
      : await storage.addGoal(goal) as Goal[];
    setGoals(updated);
    setIsAddingGoal(false);
    setEditingGoal(null);
  };

  const deleteGoal = async (id: string) => {
    setGoals(await storage.deleteGoal(id) as Goal[]);
  };

  const toggleGoalCompletion = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    setGoals(await storage.updateGoal({ ...goal, completed: !goal.completed }) as Goal[]);
  };

  const updateGoalProgress = async (id: string, current: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    setGoals(await storage.updateGoal({ ...goal, current }) as Goal[]);
  };

  const filteredGoals = goals.filter(g =>
    filter === 'active' ? !g.completed : filter === 'completed' ? g.completed : true
  );

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.completed).length,
    active: goals.filter(g => !g.completed).length,
    overdue: goals.filter(g => !g.completed && new Date(g.deadline) < new Date()).length,
  };

  if (isAddingGoal || editingGoal) {
    return (
      <GoalForm
        goal={editingGoal}
        onSave={saveGoal}
        onCancel={() => { setIsAddingGoal(false); setEditingGoal(null); }}
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
        <button onClick={() => setIsAddingGoal(true)}
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
              <button onClick={() => setIsAddingGoal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors duration-200">
                Set Your First Goal
              </button>
            )}
          </div>
        ) : (
          filteredGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal}
              onEdit={setEditingGoal}
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

const GoalCard: React.FC<{
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateProgress: (id: string, current: number) => void;
}> = ({ goal, onEdit, onDelete, onToggleComplete, onUpdateProgress }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressValue, setProgressValue] = useState(goal.current);
  const progress  = Math.min((goal.current / goal.target) * 100, 100);
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
        <div className="flex items-start space-x-3">
          <button onClick={() => onToggleComplete(goal.id)}
            className={`mt-1 transition-colors duration-200 ${goal.completed ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}>
            {goal.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <TypeIcon className="w-5 h-5 text-gray-600" />
              <h3 className={`text-lg font-semibold ${goal.completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                {goal.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityColor(goal.priority || 'medium')}`}>
                {goal.priority || 'medium'}
              </span>
            </div>
            <p className="text-gray-600 mb-3">{goal.description}</p>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress: {goal.current} / {goal.target} {goal.unit}</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all duration-300 ${goal.completed ? 'bg-green-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
              </div>
              {!goal.completed && (
                <span className={`font-medium ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!goal.completed && (
            <button onClick={() => setIsUpdating(true)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors duration-200">
              <TrendingUp className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => onEdit(goal)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors duration-200"><Edit className="w-5 h-5" /></button>
          <button onClick={() => onDelete(goal.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>
      {isUpdating && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Update Progress</h4>
          <div className="flex items-center space-x-3">
            <input type="number" value={progressValue} onChange={e => setProgressValue(Number(e.target.value))}
              min="0" max={goal.target}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <span className="text-sm text-gray-600">/ {goal.target} {goal.unit}</span>
            <button onClick={() => { onUpdateProgress(goal.id, progressValue); setIsUpdating(false); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200">Update</button>
            <button onClick={() => setIsUpdating(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalForm: React.FC<{ goal?: Goal | null; onSave: (g: Goal) => void; onCancel: () => void }> =
  ({ goal, onSave, onCancel }) => {
  const goalTypes = [
    { value: 'weight', label: 'Weight Loss/Gain', units: ['kg', 'lbs'] },
    { value: 'strength', label: 'Strength Training', units: ['kg', 'lbs', 'reps'] },
    { value: 'endurance', label: 'Endurance', units: ['km', 'miles', 'minutes'] },
    { value: 'nutrition', label: 'Nutrition', units: ['calories', 'grams', 'servings'] },
    { value: 'custom', label: 'Custom Goal', units: ['units', 'times', 'days'] },
  ];
  const [formData, setFormData] = useState({
    type: (goal?.type || 'weight') as Goal['type'],
    title: goal?.title || '', description: goal?.description || '',
    target: goal?.target || 0, current: goal?.current || 0,
    unit: goal?.unit || 'kg',
    deadline: goal?.deadline || formatDate(new Date(Date.now() + 30 * 86400000)),
    priority: (goal?.priority || 'medium') as 'low' | 'medium' | 'high',
  });
  const selectedType = goalTypes.find(t => t.value === formData.type);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: goal?.id || Date.now().toString(), ...formData, completed: goal?.completed || false } as Goal);
  };
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{goal ? 'Edit Goal' : 'Create New Goal'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal Type</label>
              <select value={formData.type}
                onChange={e => setFormData(p => ({ ...p, type: e.target.value as Goal['type'], unit: goalTypes.find(t => t.value === e.target.value)?.units[0] || '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                {goalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select value={formData.priority}
                onChange={e => setFormData(p => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
            <input type="text" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g., Lose 10kg in 3 months" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea required value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Describe your goal..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
              <input type="number" required min="0" step="0.1" value={formData.target}
                onChange={e => setFormData(p => ({ ...p, target: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Progress</label>
              <input type="number" min="0" step="0.1" value={formData.current}
                onChange={e => setFormData(p => ({ ...p, current: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                {selectedType?.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
            <input type="date" required value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200">
              {goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Goals;
