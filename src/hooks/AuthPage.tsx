// src/hooks/AuthPage.tsx
import React, { useState, useCallback } from 'react';
import { useAuthState, AuthContext } from '../components/useAuth';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

export type AuthView = 'login' | 'register' | 'forgot';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

const AuthPage: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [animating, setAnimating] = useState(false);

  const switchView = useCallback((next: AuthView) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setView(next); setAnimating(false); }, 220);
  }, [animating]);

  return (
    <div className="auth-root">
      <div className="auth-bg-circle circle-1" />
      <div className="auth-bg-circle circle-2" />
      <div className="auth-bg-circle circle-3" />

      <div className="auth-card-wrap">
        {/* Branding */}
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2"  y="16" width="8"  height="8" rx="2" fill="currentColor" opacity="0.5"/>
              <rect x="30" y="16" width="8"  height="8" rx="2" fill="currentColor" opacity="0.5"/>
              <rect x="10" y="10" width="20" height="20" rx="4" fill="currentColor" opacity="0.15"/>
              <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name">FitTracker</span>
        </div>

        <div className={`auth-card ${animating ? 'card-fade-out' : 'card-fade-in'}`}>
          {view === 'login'    && <LoginForm    onSwitch={switchView} />}
          {view === 'register' && <RegisterForm onSwitch={switchView} />}
          {view === 'forgot'   && <ForgotPasswordForm onSwitch={switchView} />}
        </div>
      </div>

      <style>{authStyles}</style>
    </div>
  );
};

export default AuthPage;

const authStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-root {
    min-height: 100vh;
    background: #f0f4ff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
    position: relative; overflow: hidden; padding: 24px;
  }

  .auth-bg-circle {
    position: absolute; border-radius: 50%;
    animation: circleFloat 14s ease-in-out infinite alternate;
  }
  .circle-1 { width:500px;height:500px;background:radial-gradient(circle,rgba(59,130,246,0.12),rgba(147,197,253,0.06));top:-150px;left:-100px; }
  .circle-2 { width:350px;height:350px;background:radial-gradient(circle,rgba(99,136,247,0.1),rgba(196,219,255,0.05));bottom:-80px;right:-60px;animation-delay:-5s; }
  .circle-3 { width:200px;height:200px;background:radial-gradient(circle,rgba(147,197,253,0.15),transparent);top:50%;left:55%;transform:translate(-50%,-50%);animation-delay:-9s; }
  @keyframes circleFloat {
    0%   { transform: translate(0,0) scale(1); }
    50%  { transform: translate(20px,-15px) scale(1.04); }
    100% { transform: translate(-15px,20px) scale(0.97); }
  }

  .auth-card-wrap {
    position:relative;z-index:2;
    width:100%;max-width:440px;
    display:flex;flex-direction:column;align-items:center;gap:24px;
  }

  .brand {
    display:flex;align-items:center;gap:10px;
    font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;
    color:#1e2a3a;letter-spacing:-0.4px;
  }
  .brand-icon {
    width:38px;height:38px;
    background:linear-gradient(135deg,#3b82f6,#2563eb);
    border-radius:10px;display:flex;align-items:center;justify-content:center;
    color:white;box-shadow:0 4px 14px rgba(59,130,246,0.35);
  }
  .brand-icon svg { width:22px;height:22px; }

  .auth-card {
    width:100%;
    background:rgba(255,255,255,0.95);
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid rgba(99,136,247,0.15);
    border-radius:20px;padding:36px 32px;
    box-shadow:0 8px 40px rgba(99,136,247,0.1),0 2px 8px rgba(0,0,0,0.04);
  }
  .card-fade-in  { animation:fadeSlideIn  0.3s  ease forwards; }
  .card-fade-out { animation:fadeSlideOut 0.22s ease forwards; }
  @keyframes fadeSlideIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideOut { from{opacity:1;transform:translateY(0)}   to{opacity:0;transform:translateY(-8px)} }

  .form-title    { font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:700;color:#1e2a3a;margin-bottom:4px;letter-spacing:-0.4px; }
  .form-subtitle { font-size:13.5px;color:#7a8fa6;margin-bottom:28px;line-height:1.5; }
  .form-subtitle span { color:#3b82f6;cursor:pointer; }
  .form-subtitle span:hover { text-decoration:underline; }

  .field { margin-bottom:16px; }
  .field-label { display:block;font-size:12.5px;font-weight:500;color:#5a6f87;margin-bottom:6px;letter-spacing:0.3px; }
  .input-wrap { position:relative; }
  .input-icon { position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#a0b0c0;pointer-events:none;display:flex;align-items:center;transition:color 0.2s; }
  .field-input {
    width:100%;background:#f8faff;border:1px solid #dde6ff;
    border-radius:10px;color:#1e2a3a;font-family:'DM Sans',sans-serif;font-size:14px;
    padding:11px 40px 11px 38px;outline:none;
    transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
  }
  .field-input::placeholder { color:#a0b0c0; }
  .field-input:focus { border-color:rgba(59,130,246,0.5);background:#ffffff;box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
  .field-input:focus ~ .input-icon,.input-wrap:focus-within .input-icon { color:#3b82f6; }
  .field-input.error { border-color:rgba(220,38,38,0.5); }
  .field-input.valid { border-color:rgba(5,150,105,0.4); }

  .eye-btn { position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#a0b0c0;padding:2px;display:flex;align-items:center;transition:color 0.2s; }
  .eye-btn:hover { color:#5a6f87; }

  .field-error   { font-size:11.5px;color:#dc2626;margin-top:5px;display:flex;align-items:center;gap:4px; }
  .field-success { font-size:11.5px;color:#059669;margin-top:5px;display:flex;align-items:center;gap:4px; }

  .strength-wrap { margin-top:8px; }
  .strength-bars { display:flex;gap:4px;margin-bottom:5px; }
  .strength-bar  { height:3px;flex:1;border-radius:9999px;background:#e8eeff;transition:background 0.3s; }
  .strength-bar.filled-weak   { background:#ef4444; }
  .strength-bar.filled-medium { background:#f59e0b; }
  .strength-bar.filled-strong { background:#10b981; }
  .strength-tips { font-size:11px;color:#a0b0c0;margin-top:4px;line-height:1.6; }

  .submit-btn {
    width:100%;padding:12px;
    background:linear-gradient(135deg,#3b82f6,#2563eb);
    border:none;border-radius:10px;color:white;
    font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.2px;
    cursor:pointer;margin-top:8px;
    transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s;
    box-shadow:0 4px 16px rgba(59,130,246,0.3);
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .submit-btn:hover:not(:disabled) { opacity:0.92;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,130,246,0.4); }
  .submit-btn:active:not(:disabled){ transform:translateY(0); }
  .submit-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .alert { border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;line-height:1.5; }
  .alert-error   { background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.2);color:#b91c1c; }
  .alert-success { background:rgba(5,150,105,0.07);border:1px solid rgba(5,150,105,0.2);color:#065f46; }
  .alert-icon { margin-top:1px;flex-shrink:0; }

  .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .forgot-link { font-size:12px;color:#3b82f6;background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif; }
  .forgot-link:hover { text-decoration:underline; }

  .username-checking { font-size:11.5px;color:#a0b0c0;margin-top:5px;display:flex;align-items:center;gap:5px; }
  .mini-spinner { width:10px;height:10px;border:1.5px solid rgba(160,176,192,0.4);border-top-color:#a0b0c0;border-radius:50%;animation:spin 0.7s linear infinite; }

  .verify-banner { text-align:center;padding:12px 0 4px; }
  .verify-icon   { width:56px;height:56px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#3b82f6; }
  .verify-title  { font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;color:#1e2a3a;margin-bottom:8px; }
  .verify-text   { font-size:13.5px;color:#7a8fa6;line-height:1.6;margin-bottom:24px; }
  .verify-text strong { color:#5a6f87; }

  @media (max-width:480px) { .auth-card { padding:28px 20px; } }
`;
