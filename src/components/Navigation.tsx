// src/components/Navigation.tsx
import React, { useState } from 'react';
import {
  Home, Dumbbell, Apple, Heart,
  TrendingUp, Target, User, LogOut, Menu, X,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthUser extends FirebaseUser { username?: string; }

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'workouts',  label: 'Workouts',  icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'health',    label: 'Health',    icon: Heart },
  { id: 'progress',  label: 'Progress',  icon: TrendingUp },
  { id: 'goals',     label: 'Goals',     icon: Target },
  { id: 'profile',   label: 'Profile',   icon: User },
];

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.username || user?.displayName || user?.email?.split('@')[0] || 'Profile';

  const handleTab = (id: string) => { onTabChange(id); setMobileOpen(false); };

  return (
    <>
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid rgba(99,136,247,0.15)',
        position: 'sticky', top: 0, zIndex: 50,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: '0 1px 12px rgba(99,136,247,0.08)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              }}>
                <Heart size={18} color="white" fill="white" />
              </div>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 18, fontWeight: 800,
                color: '#1e2a3a', letterSpacing: '-0.4px',
              }}>
                FitTracker
              </span>
            </div>

            {/* Desktop tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button key={id} onClick={() => handleTab(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 13px', borderRadius: 8, border: 'none',
                      background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: active ? '#3b82f6' : '#7a8fa6',
                      cursor: 'pointer', fontSize: 13.5,
                      fontWeight: active ? 600 : 400,
                      fontFamily: 'inherit', transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#1e2a3a'; (e.currentTarget as HTMLElement).style.background = '#f0f4ff'; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#7a8fa6'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
                  >
                    <Icon size={15} />
                    <span>{id === 'profile' ? displayName : label}</span>
                  </button>
                );
              })}

              {/* Logout */}
              <button onClick={onLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 8,
                  border: '1px solid rgba(220,38,38,0.2)',
                  background: 'rgba(220,38,38,0.05)',
                  color: '#dc2626', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500,
                  fontFamily: 'inherit', marginLeft: 6, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.2)'; }}
              >
                <LogOut size={14} />Logout
              </button>
            </div>

            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a8fa6', padding: 4, display: 'none' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{ background: '#ffffff', borderTop: '1px solid rgba(99,136,247,0.1)', padding: '12px 16px 16px' }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => handleTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 14px',
                    borderRadius: 10, border: 'none',
                    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: active ? '#3b82f6' : '#7a8fa6',
                    cursor: 'pointer', fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    fontFamily: 'inherit', textAlign: 'left', marginBottom: 2,
                  }}>
                  <Icon size={16} />{id === 'profile' ? displayName : label}
                </button>
              );
            })}
            <button onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid rgba(220,38,38,0.2)',
                background: 'rgba(220,38,38,0.05)', color: '#dc2626',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                fontFamily: 'inherit', marginTop: 8,
              }}>
              <LogOut size={16} />Logout
            </button>
          </div>
        )}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Navigation;
