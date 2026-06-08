// src/components/RegisterForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, AuthError } from './useAuth';
import {
  analyzePassword,
  isPasswordAcceptable,
  isValidEmail,
  isValidUsername,
  isUsernameAvailable,
} from '../utils/validation';
import type { AuthView } from '../hooks/AuthPage';

// ─── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const AlertIcon = () => (
  <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Password strength bar ────────────────────────────────────────────────────
const StrengthBar: React.FC<{ password: string }> = ({ password }) => {
  const a = analyzePassword(password);
  if (!password) return null;
  const barClass = (i: number) => {
    if (!a.score) return '';
    if (a.strength === 'weak')   return i < 2 ? 'filled-weak'   : '';
    if (a.strength === 'medium') return i < 3 ? 'filled-medium' : '';
    return 'filled-strong';
  };
  return (
    <div className="strength-wrap">
      <div className="strength-bars">
        {[0,1,2,3].map(i => <div key={i} className={`strength-bar ${barClass(i)}`} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: a.color, fontSize: '11.5px', fontWeight: 500 }}>{a.label}</span>
        {a.strength === 'weak' && <span style={{ color: '#6b7280', fontSize: '11px' }}>Not accepted</span>}
      </div>
      {a.tips.length > 0 && (
        <div className="strength-tips">
          {a.tips.map((t, i) => <span key={i} style={{ display: 'block' }}>· {t}</span>)}
        </div>
      )}
    </div>
  );
};

// ─── Verification sent screen ─────────────────────────────────────────────────
const VerifyEmailScreen: React.FC<{ email: string; onSwitch: (v: AuthView) => void }> = ({ email, onSwitch }) => (
  <div className="verify-banner">
    <div className="verify-icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    </div>
    <div className="verify-title">Verify your email</div>
    <p className="verify-text">
      We sent a verification link to<br />
      <strong>{email}</strong>
    </p>
    <p className="verify-text" style={{ marginTop: -12 }}>
      Click the link in that email to activate your account.
      Once verified, you'll be redirected back to sign in automatically.
    </p>
    <p className="verify-text" style={{ fontSize: '12px', opacity: 0.65, marginTop: -12 }}>
      Can't find it? Check your spam folder.
    </p>
    <button className="submit-btn" style={{ marginTop: 0 }} onClick={() => onSwitch('login')}>
      Go to Sign In
    </button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { onSwitch: (view: AuthView) => void; }

const RegisterForm: React.FC<Props> = ({ onSwitch }) => {
  const { register } = useAuth();

  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [bannerErr, setBannerErr] = useState('');
  const [done, setDone]           = useState(false);

  // Per-field validation state
  const [usernameErr, setUsernameErr] = useState('');
  const [usernameOk, setUsernameOk]   = useState(false);
  const [checking, setChecking]       = useState(false);
  const [emailErr, setEmailErr]       = useState('');
  const [confirmErr, setConfirmErr]   = useState('');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Username: format check → debounced Firestore availability check
  useEffect(() => {
    setUsernameOk(false);
    if (!username) { setUsernameErr(''); return; }
    const fmtErr = isValidUsername(username);
    if (fmtErr) { setUsernameErr(fmtErr); return; }
    setUsernameErr('');
    setChecking(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(username);
      setChecking(false);
      if (!avail) setUsernameErr('This username is already taken.');
      else setUsernameOk(true);
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [username]);

  // Email: validate on blur
  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) setEmailErr('Please enter a valid email address.');
    else setEmailErr('');
  };

  // Confirm: live match check
  useEffect(() => {
    if (confirm && confirm !== password) setConfirmErr('Passwords do not match.');
    else setConfirmErr('');
  }, [confirm, password]);

  const canSubmit =
    !!username && usernameOk &&
    !!email && !emailErr &&
    !!password && isPasswordAcceptable(password) &&
    confirm === password && confirm !== '' &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerErr('');
    if (!canSubmit) return;
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, username.trim());
      setDone(true);
    } catch (err: any) {
      const code: string = err instanceof AuthError ? err.code : (err?.code ?? '');
      if (code === 'auth/email-already-in-use') {
        setEmailErr('An account with this email already exists.');
      } else if (code === 'auth/username-taken') {
        setUsernameErr('This username is already taken.');
        setUsernameOk(false);
      } else if (code === 'auth/weak-password') {
        setBannerErr('Password is too weak. Please choose a stronger one.');
      } else if (code === 'auth/invalid-email' || code === 'auth/invalid-email-format') {
        setEmailErr('Please enter a valid email address.');
      } else if (code === 'auth/network-request-failed') {
        setBannerErr('Network error. Please check your connection.');
      } else {
        setBannerErr('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) return <VerifyEmailScreen email={email} onSwitch={onSwitch} />;

  return (
    <div>
      <h1 className="form-title">Create account</h1>
      <p className="form-subtitle">
        Already have an account?{' '}
        <span onClick={() => onSwitch('login')}>Sign in</span>
      </p>

      {bannerErr && (
        <div className="alert alert-error">
          <AlertIcon /><span>{bannerErr}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Username */}
        <div className="field">
          <label className="field-label">Username</label>
          <div className="input-wrap">
            <span className="input-icon"><UserIcon /></span>
            <input
              type="text"
              className={`field-input ${usernameErr ? 'error' : usernameOk ? 'valid' : ''}`}
              placeholder="your_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              maxLength={20}
            />
          </div>
          {checking && <div className="username-checking"><span className="mini-spinner" />Checking availability…</div>}
          {!checking && usernameErr && <div className="field-error"><XIcon />{usernameErr}</div>}
          {!checking && usernameOk  && <div className="field-success"><CheckIcon />Username is available!</div>}
        </div>

        {/* Email */}
        <div className="field">
          <label className="field-label">Email address</label>
          <div className="input-wrap">
            <span className="input-icon"><MailIcon /></span>
            <input
              type="email"
              className={`field-input ${emailErr ? 'error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
              onBlur={handleEmailBlur}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          {emailErr && <div className="field-error"><XIcon />{emailErr}</div>}
        </div>

        {/* Password */}
        <div className="field">
          <label className="field-label">Password</label>
          <div className="input-wrap">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className="field-input"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              <EyeIcon open={showPw} />
            </button>
          </div>
          <StrengthBar password={password} />
        </div>

        {/* Confirm */}
        <div className="field">
          <label className="field-label">Confirm password</label>
          <div className="input-wrap">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={showCf ? 'text' : 'password'}
              className={`field-input ${confirmErr ? 'error' : confirm && !confirmErr ? 'valid' : ''}`}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            <button type="button" className="eye-btn" onClick={() => setShowCf(p => !p)} tabIndex={-1}>
              <EyeIcon open={showCf} />
            </button>
          </div>
          {confirmErr             && <div className="field-error"><XIcon />{confirmErr}</div>}
          {confirm && !confirmErr && <div className="field-success"><CheckIcon />Passwords match</div>}
        </div>

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {loading ? <><span className="spinner" />Creating account…</> : 'Create account'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
