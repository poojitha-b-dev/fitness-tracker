// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from './useAuth';
import type { AuthView } from '../hooks/AuthPage';

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertIcon = () => (
  <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Firebase error messages ──────────────────────────────────────────────────
const getFirebaseError = (code: string): string => {
  const map: Record<string, string> = {
    'auth/user-not-found':        'No account found with this email address.',
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/invalid-credential':    'Invalid email or password.',
    'auth/too-many-requests':     'Too many failed attempts. Please try again later or reset your password.',
    'auth/user-disabled':         'This account has been disabled. Please contact support.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/network-request-failed':'Network error. Please check your connection.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
};

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { onSwitch: (view: AuthView) => void; }

const LoginForm: React.FC<Props> = ({ onSwitch }) => {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setError(getFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="form-title">Welcome back</h1>
      <p className="form-subtitle">
        Don't have an account? <span onClick={() => onSwitch('register')}>Create one</span>
      </p>

      {error && (
        <div className="alert alert-error">
          <AlertIcon /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label">Email address</label>
          <div className="input-wrap">
            <span className="input-icon"><MailIcon /></span>
            <input
              type="email" className="field-input" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" disabled={loading}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Password</label>
          <div className="input-wrap">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'} className="field-input" placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" disabled={loading}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              <EyeIcon open={showPw} />
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '20px' }}>
          <button type="button" className="forgot-link" onClick={() => onSwitch('forgot')}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? <><span className="spinner" />Signing in…</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;