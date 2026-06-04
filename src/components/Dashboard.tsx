// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Dumbbell, Flame, Heart, Trophy, Plus, Apple, Target } from 'lucide-react';
import { storage } from '../utils/storage';
import { calculateBMI, getBMICategory } from '../utils/calculations';
import { useAuth } from './useAuth';

interface DashboardProps { onTabChange: (tab: string) => void; }

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0, weeklyWorkouts: 0,
    totalCalories: 0, weeklyCalories: 0,
    currentWeight: 0, bmi: 0, bmiCategory: '',
    completedGoals: 0, totalGoals: 0,
  });
  const [loaded, setLoaded] = useState(false);

  const loadStats = () => {
    const user        = storage.getUser() as any;
    const workouts    = storage.getWorkouts() as any[];
    const nutrition   = storage.getNutrition() as any[];
    const healthMetrics = storage.getHealthMetrics() as any[];
    const goals       = storage.getGoals() as any[];

    const today   = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyWorkouts  = workouts.filter(w => new Date(w.date) >= weekAgo);
    const weeklyNutrition = nutrition.filter(n => new Date(n.date) >= weekAgo);
    const weeklyCalories  = weeklyNutrition.reduce((s, n) => s + (n.totalCalories || 0), 0);
    const latestMetric    = healthMetrics[0] || null;
    const currentWeight   = latestMetric?.weight || user?.currentWeight || 0;
    const bmi             = user?.height && currentWeight ? calculateBMI(currentWeight, user.height) : 0;
    const completedGoals  = goals.filter(g => g.completed).length;

    setStats({
      totalWorkouts:  workouts.length,
      weeklyWorkouts: weeklyWorkouts.length,
      totalCalories:  nutrition.reduce((s, n) => s + (n.totalCalories || 0), 0),
      weeklyCalories,
      currentWeight,
      bmi,
      bmiCategory: bmi ? getBMICategory(bmi) : '',
      completedGoals,
      totalGoals: goals.length,
    });
    setLoaded(true);
  };

  // Load immediately and also after cloud sync completes
  useEffect(() => {
    loadStats();
    // Re-load after a short delay to catch data synced from Firestore on login
    const timer = setTimeout(loadStats, 1500);
    return () => clearTimeout(timer);
  }, [currentUser?.uid]); // re-run when user changes (login/logout)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}!
        </h1>
        <p className="text-gray-600 mt-2">Here's your fitness overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Dumbbell} title="Workouts This Week" value={stats.weeklyWorkouts}
          subtitle={`${stats.totalWorkouts} total`} color="bg-blue-500" onClick={() => onTabChange('workouts')} />
        <StatCard icon={Flame} title="Calories This Week" value={stats.weeklyCalories.toLocaleString()}
          subtitle={`${stats.totalCalories.toLocaleString()} total`} color="bg-orange-500" onClick={() => onTabChange('nutrition')} />
        <StatCard icon={Heart} title="Current Weight"
          value={stats.currentWeight ? `${stats.currentWeight}kg` : 'N/A'}
          subtitle={stats.bmiCategory ? `BMI: ${stats.bmi.toFixed(1)} (${stats.bmiCategory})` : 'Log health metrics'}
          color="bg-red-500" onClick={() => onTabChange('health')} />
        <StatCard icon={Trophy} title="Goals Completed" value={`${stats.completedGoals}/${stats.totalGoals}`}
          subtitle={stats.totalGoals > 0 ? `${Math.round((stats.completedGoals / stats.totalGoals) * 100)}% complete` : 'No goals set'}
          color="bg-purple-500" onClick={() => onTabChange('goals')} />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction icon={Plus}  title="Log Workout"           description="Record your latest training session" onClick={() => onTabChange('workouts')}  color="bg-blue-500" />
          <QuickAction icon={Apple} title="Track Nutrition"       description="Log your meals and calories"         onClick={() => onTabChange('nutrition')} color="bg-orange-500" />
          <QuickAction icon={Heart} title="Record Health Metrics" description="Update weight, BP, and more"         onClick={() => onTabChange('health')}    color="bg-red-500" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <button onClick={() => onTabChange('progress')} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
            View All
          </button>
        </div>
        <div className="space-y-4">
          <ActivityItem icon={Dumbbell} iconBg="bg-blue-100"   iconColor="text-blue-600"   title="Log your first workout"    subtitle="Get started with the Workouts tab"    onClick={() => onTabChange('workouts')} />
          <ActivityItem icon={Apple}   iconBg="bg-orange-100" iconColor="text-orange-600" title="Track your meals today"    subtitle="Log breakfast, lunch and dinner"       onClick={() => onTabChange('nutrition')} />
          <ActivityItem icon={Target}  iconBg="bg-purple-100" iconColor="text-purple-600" title="Set your first fitness goal" subtitle="Define what you want to achieve"     onClick={() => onTabChange('goals')} />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ComponentType<any>; title: string; value: string | number; subtitle?: string; color: string; onClick?: () => void }> =
  ({ icon: Icon, title, value, subtitle, color, onClick }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6 text-white" /></div>
    </div>
  </div>
);

const QuickAction: React.FC<{ icon: React.ComponentType<any>; title: string; description: string; onClick: () => void; color: string }> =
  ({ icon: Icon, title, description, onClick, color }) => (
  <button onClick={onClick} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 text-left">
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </button>
);

const ActivityItem: React.FC<{ icon: React.ComponentType<any>; iconBg: string; iconColor: string; title: string; subtitle: string; onClick: () => void }> =
  ({ icon: Icon, iconBg, iconColor, title, subtitle, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
    <div className={`p-2 ${iconBg} rounded-lg`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  </button>
);

export default Dashboard;
