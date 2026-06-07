// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth, AuthError, SITE_URL } from './useAuth';
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
const XCircle = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { onSwitch: (view: AuthView) => void; }

const LoginForm: React.FC<Props> = ({ onSwitch }) => {
  const { login } = useAuth();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);

  // Separate error state per field + a general banner
  const [emailErr, setEmailErr]     = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [bannerErr, setBannerErr]   = useState('');

  // Unverified email state
  const [unverified, setUnverified]         = useState(false);
  const [resendLoading, setResendLoading]   = useState(false);
  const [resendSent, setResendSent]         = useState(false);

  const clearErrors = () => {
    setEmailErr('');
    setPasswordErr('');
    setBannerErr('');
    setUnverified(false);
    setResendSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Basic client-side validation
    if (!email.trim())  { setEmailErr('Please enter your email address.'); return; }
    if (!password)      { setPasswordErr('Please enter your password.'); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // If login() resolves without throwing, AuthGate will redirect automatically
    } catch (err: any) {
      const code: string = err instanceof AuthError ? err.code : (err?.code ?? '');

      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setEmailErr('No account found with this email address.');
      } else if (code === 'auth/wrong-password') {
        setPasswordErr('Incorrect password. Please try again.');
      } else if (code === 'auth/email-not-verified') {
        setUnverified(true);
        setBannerErr('Your email is not verified yet. Check your inbox for the verification link.');
      } else if (code === 'auth/too-many-requests') {
        setBannerErr('Too many failed attempts. Please wait a few minutes or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setBannerErr('Network error. Please check your connection and try again.');
      } else {
        setBannerErr('Sign-in failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend: temporarily sign in to get user object, send email, sign back out
  const handleResend = async () => {
    if (!email.trim() || !password) {
      setBannerErr('Please make sure your email and password are filled in above.');
      return;
    }
    setResendLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(cred.user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
      await signOut(auth);
      setResendSent(true);
      setBannerErr('');
    } catch {
      setBannerErr('Could not resend. Please check your email and password are correct.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div>
      <h1 className="form-title">Welcome back</h1>
      <p className="form-subtitle">
        Don't have an account?{' '}
        <span onClick={() => onSwitch('register')}>Create one</span>
      </p>

      {/* Banner for general / unverified errors */}
      {(bannerErr || resendSent) && (
        <div className={`alert ${resendSent ? 'alert-success' : 'alert-error'}`}>
          <XCircle />
          <div style={{ flex: 1 }}>
            {resendSent
              ? 'Verification email sent! Check your inbox, then sign in.'
              : bannerErr
            }
            {unverified && !resendSent && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResend}
                  style={{
                    background: 'none', border: '1px solid currentColor',
                    borderRadius: 6, padding: '3px 10px', fontSize: 11.5,
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                    color: 'inherit', fontFamily: 'inherit',
                    opacity: resendLoading ? 0.6 : 1,
                  }}
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
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
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>
          {emailErr && <div className="field-error"><XCircle />{emailErr}</div>}
        </div>

        {/* Password */}
        <div className="field">
          <label className="field-label">Password</label>
          <div className="input-wrap">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className={`field-input ${passwordErr ? 'error' : ''}`}
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordErr(''); }}
              autoComplete="current-password"
              disabled={loading}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              <EyeIcon open={showPw} />
            </button>
          </div>
          {passwordErr && <div className="field-error"><XCircle />{passwordErr}</div>}
        </div>

        <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '20px' }}>
          <button type="button" className="forgot-link" onClick={() => onSwitch('forgot')}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="submit-btn" disabled={loading || !email.trim() || !password}>
          {loading ? <><span className="spinner" />Signing in…</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
