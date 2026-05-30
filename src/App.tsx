// src/App.tsx
import React, { useState } from 'react';
import { AuthProvider } from './hooks/AuthPage';
import { useAuth } from './components/useAuth';
import AuthPage from './hooks/AuthPage';
import Dashboard from './components/Dashboard';
import WorkoutTracker from './components/WorkoutTracker';
import NutritionTracker from './components/NutritionTracker';
import HealthMetrics from './components/HealthMetrics';
import Progress from './components/Progress';
import Goals from './components/Goals';
import Navigation from './components/Navigation';
import Profile from './components/Profile';

// ─── Inner app — only shown when authenticated ────────────────────────────────
const FitnessApp: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard onTabChange={setActiveTab} />;
      case 'workouts':   return <WorkoutTracker />;
      case 'nutrition':  return <NutritionTracker />;
      case 'health':     return <HealthMetrics />;
      case 'progress':   return <Progress />;
      case 'goals':      return <Goals />;
      case 'profile':    return <Profile />;
      default:           return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={currentUser}
        onLogout={logout}
      />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTab()}
      </main>
    </div>
  );
};

// ─── Auth gate ────────────────────────────────────────────────────────────────
const AuthGate: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050a0e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid rgba(16,185,129,0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return currentUser ? <FitnessApp /> : <AuthPage />;
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
);

export default App;
