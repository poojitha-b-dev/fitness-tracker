// src/hooks/AuthPage.tsx
import React, { useState, useCallback } from 'react';
import { useAuthState, AuthContext } from '../components/useAuth';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

export type AuthView = 'login' | 'register' | 'forgot';

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

// ─── AuthPage ─────────────────────────────────────────────────────────────────
const AuthPage: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [animating, setAnimating] = useState(false);

  const switchView = useCallback((next: AuthView) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setView(next);
      setAnimating(false);
    }, 220);
  }, [animating]);

  return (
    <div className="auth-root">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="grain" />

      <div className="auth-card-wrap">
        {/* Branding */}
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2"  y="16" width="8"  height="8" rx="2" fill="currentColor" opacity="0.4"/>
              <rect x="30" y="16" width="8"  height="8" rx="2" fill="currentColor" opacity="0.4"/>
              <rect x="10" y="10" width="20" height="20" rx="4" fill="currentColor" opacity="0.15"/>
              <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name">FitTrack</span>
        </div>

        {/* Card */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const authStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-root {
    min-height: 100vh;
    background: #050a0e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
    padding: 24px;
  }

  .blob {
    position: absolute; border-radius: 50%;
    filter: blur(90px); opacity: 0.18;
    animation: blobFloat 12s ease-in-out infinite alternate;
  }
  .blob-1 { width:520px;height:520px;background:radial-gradient(circle,#10b981,#059669);top:-120px;left:-100px;animation-duration:14s; }
  .blob-2 { width:380px;height:380px;background:radial-gradient(circle,#06b6d4,#0284c7);bottom:-80px;right:-60px;animation-duration:10s;animation-delay:-4s; }
  .blob-3 { width:260px;height:260px;background:radial-gradient(circle,#34d399,#6ee7b7);top:50%;left:50%;transform:translate(-50%,-50%);animation-duration:16s;animation-delay:-8s;opacity:0.08; }
  @keyframes blobFloat {
    0%   { transform: translate(0,0) scale(1); }
    50%  { transform: translate(30px,-20px) scale(1.05); }
    100% { transform: translate(-20px,30px) scale(0.97); }
  }

  .grain {
    position:absolute;inset:0;pointer-events:none;z-index:1;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity:0.5;
  }

  .auth-card-wrap {
    position:relative;z-index:2;
    width:100%;max-width:440px;
    display:flex;flex-direction:column;align-items:center;gap:28px;
  }

  .brand {
    display:flex;align-items:center;gap:10px;
    font-family:'Syne',sans-serif;font-size:22px;font-weight:800;
    color:#ecfdf5;letter-spacing:-0.3px;
  }
  .brand-icon {
    width:38px;height:38px;
    background:linear-gradient(135deg,#10b981,#059669);
    border-radius:10px;display:flex;align-items:center;justify-content:center;
    color:white;box-shadow:0 0 20px rgba(16,185,129,0.4);
  }
  .brand-icon svg { width:22px;height:22px; }
  .brand-name { font-family:'Syne',sans-serif; }

  .auth-card {
    width:100%;
    background:rgba(15,23,20,0.7);
    backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
    border:1px solid rgba(52,211,153,0.12);
    border-radius:20px;padding:36px 32px;
    box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset,0 40px 80px rgba(0,0,0,0.5),0 0 60px rgba(16,185,129,0.04);
  }
  .card-fade-in  { animation:fadeSlideIn  0.3s  ease forwards; }
  .card-fade-out { animation:fadeSlideOut 0.22s ease forwards; }
  @keyframes fadeSlideIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideOut { from{opacity:1;transform:translateY(0)}   to{opacity:0;transform:translateY(-8px)} }

  .form-title    { font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#ecfdf5;margin-bottom:4px;letter-spacing:-0.4px; }
  .form-subtitle { font-size:13.5px;color:#6b7280;margin-bottom:28px;line-height:1.5; }
  .form-subtitle span { color:#34d399;cursor:pointer; }
  .form-subtitle span:hover { text-decoration:underline; }

  .field { margin-bottom:16px; }
  .field-label { display:block;font-size:12.5px;font-weight:500;color:#9ca3af;margin-bottom:6px;letter-spacing:0.3px; }
  .input-wrap { position:relative; }
  .input-icon { position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#4b5563;pointer-events:none;display:flex;align-items:center;transition:color 0.2s; }
  .field-input {
    width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:10px;color:#e5e7eb;font-family:'DM Sans',sans-serif;font-size:14px;
    padding:11px 40px 11px 38px;outline:none;
    transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
  }
  .field-input::placeholder { color:#374151; }
  .field-input:focus { border-color:rgba(52,211,153,0.4);background:rgba(255,255,255,0.06);box-shadow:0 0 0 3px rgba(16,185,129,0.1); }
  .field-input:focus ~ .input-icon,.input-wrap:focus-within .input-icon { color:#34d399; }
  .field-input.error { border-color:rgba(239,68,68,0.5); }
  .field-input.valid { border-color:rgba(52,211,153,0.3); }

  .eye-btn { position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#4b5563;padding:2px;display:flex;align-items:center;transition:color 0.2s; }
  .eye-btn:hover { color:#9ca3af; }

  .field-error   { font-size:11.5px;color:#f87171;margin-top:5px;display:flex;align-items:center;gap:4px; }
  .field-success { font-size:11.5px;color:#34d399;margin-top:5px;display:flex;align-items:center;gap:4px; }

  .strength-wrap { margin-top:8px; }
  .strength-bars { display:flex;gap:4px;margin-bottom:5px; }
  .strength-bar  { height:3px;flex:1;border-radius:9999px;background:rgba(255,255,255,0.07);transition:background 0.3s; }
  .strength-bar.filled-weak   { background:#ef4444; }
  .strength-bar.filled-medium { background:#f59e0b; }
  .strength-bar.filled-strong { background:#10b981; }
  .strength-tips { font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6; }

  .submit-btn {
    width:100%;padding:12px;
    background:linear-gradient(135deg,#10b981,#059669);
    border:none;border-radius:10px;color:white;
    font-family:'Syne',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.2px;
    cursor:pointer;margin-top:8px;
    transition:opacity 0.2s,transform 0.15s,box-shadow 0.2s;
    box-shadow:0 4px 20px rgba(16,185,129,0.3);
    display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .submit-btn:hover:not(:disabled) { opacity:0.9;transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,0.4); }
  .submit-btn:active:not(:disabled){ transform:translateY(0); }
  .submit-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .alert { border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;line-height:1.5; }
  .alert-error   { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#fca5a5; }
  .alert-success { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#6ee7b7; }
  .alert-icon { margin-top:1px;flex-shrink:0; }

  .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .forgot-link { font-size:12px;color:#34d399;background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',sans-serif; }
  .forgot-link:hover { text-decoration:underline; }

  .username-checking { font-size:11.5px;color:#6b7280;margin-top:5px;display:flex;align-items:center;gap:5px; }
  .mini-spinner { width:10px;height:10px;border:1.5px solid rgba(107,114,128,0.4);border-top-color:#6b7280;border-radius:50%;animation:spin 0.7s linear infinite; }

  .verify-banner { text-align:center;padding:12px 0 4px; }
  .verify-icon   { width:56px;height:56px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#34d399; }
  .verify-title  { font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#ecfdf5;margin-bottom:8px; }
  .verify-text   { font-size:13.5px;color:#6b7280;line-height:1.6;margin-bottom:24px; }
  .verify-text strong { color:#9ca3af; }

  @media (max-width:480px) { .auth-card { padding:28px 20px; } }
`;
