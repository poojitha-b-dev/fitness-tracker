import React, { useState } from 'react';
import {
  Home,
  Dumbbell,
  Apple,
  Heart,
  TrendingUp,
  Target,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthUser extends FirebaseUser {
  username?: string;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

const tabs = [
  { id: 'dashboard',  label: 'Dashboard',  icon: Home },
  { id: 'workouts',   label: 'Workouts',   icon: Dumbbell },
  { id: 'nutrition',  label: 'Nutrition',  icon: Apple },
  { id: 'health',     label: 'Health',     icon: Heart },
  { id: 'progress',   label: 'Progress',   icon: TrendingUp },
  { id: 'goals',      label: 'Goals',      icon: Target },
  { id: 'profile',    label: 'Profile',    icon: User },
];

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.username || user?.displayName || user?.email?.split('@')[0] || 'Profile';

  const handleLogout = async () => {
    await onLogout();
  };

  const handleTab = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav style={{
        background: '#0a0f0c',
        borderBottom: '1px solid rgba(52,211,153,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(16,185,129,0.35)',
              }}>
                <Heart size={18} color="white" fill="white" />
              </div>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 18, fontWeight: 800,
                color: '#ecfdf5', letterSpacing: '-0.3px',
              }}>
                FitTracker
              </span>
            </div>

            {/* Desktop tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTab(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: active ? 'rgba(16,185,129,0.14)' : 'transparent',
                      color: active ? '#34d399' : '#6b7280',
                      cursor: 'pointer',
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 400,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = '#d1fae5';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = '#6b7280';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={15} />
                    <span>{id === 'profile' ? displayName : label}</span>
                  </button>
                );
              })}

              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.25)',
                  background: 'rgba(239,68,68,0.07)',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  marginLeft: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)';
                }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', padding: 4,
                display: 'none',
              }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{
            background: '#0d1410',
            borderTop: '1px solid rgba(52,211,153,0.1)',
            padding: '12px 16px 16px',
          }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 14px',
                    borderRadius: 10, border: 'none',
                    background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: active ? '#34d399' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    marginBottom: 2,
                  }}
                >
                  <Icon size={16} />
                  {id === 'profile' ? displayName : label}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.07)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: 14, fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 8,
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Navigation;