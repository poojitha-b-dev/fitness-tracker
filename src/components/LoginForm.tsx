// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertIcon = () => (
  <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { onSwitch: (view: AuthView) => void; }

const LoginForm: React.FC<Props> = ({ onSwitch }) => {
  const { login } = useAuth();
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [emailError, setEmailError]           = useState('');   // email-specific error
  const [passwordError, setPasswordError]     = useState('');   // password-specific error
  const [generalError, setGeneralError]       = useState('');   // other errors
  const [unverified, setUnverified]           = useState(false);
  const [resendLoading, setResendLoading]     = useState(false);
  const [resendSent, setResendSent]           = useState(false);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    setUnverified(false);
    setResendSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim()) { setEmailError('Please enter your email address.'); return; }
    if (!password)     { setPasswordError('Please enter your password.'); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const code = (err as any).code ?? (err instanceof FirebaseError ? err.code : '');

      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Email does not exist in the system
        setEmailError('No account found with this email address.');
      } else if (code === 'auth/wrong-password') {
        // Email exists but password is wrong
        setPasswordError('Incorrect password. Please try again.');
      } else if (code === 'auth/invalid-credential') {
        // Firebase v9+ merges these — we already pre-checked email existence
        // so if we reach here, the password is wrong
        setPasswordError('Incorrect password. Please try again.');
      } else if (code === 'auth/email-not-verified') {
        setUnverified(true);
        setGeneralError('Your email is not verified. Click the link we sent to your inbox, then sign in.');
      } else if (code === 'auth/too-many-requests') {
        setGeneralError('Too many failed attempts. Please wait a few minutes or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setGeneralError('Network error. Please check your connection.');
      } else {
        setGeneralError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-send verification: sign in temporarily, send email, sign back out
  const handleResend = async () => {
    if (!email.trim() || !password) {
      setGeneralError('Enter your email and password above so we can resend the link.');
      return;
    }
    setResendLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(credential.user, {
        url: 'https://myfittrackr.vercel.app/',
        handleCodeInApp: false,
      });
      await signOut(auth);
      setResendSent(true);
    } catch {
      setGeneralError('Could not resend. Please check your email and password are correct.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div>
      <h1 className="form-title">Welcome back</h1>
      <p className="form-subtitle">
        Don't have an account? <span onClick={() => onSwitch('register')}>Create one</span>
      </p>

      {/* General / unverified error banner */}
      {(generalError || unverified) && (
        <div className="alert alert-error">
          <AlertIcon />
          <div style={{ flex: 1 }}>
            <span>{generalError}</span>
            {unverified && !resendSent && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: 'none', border: '1px solid currentColor',
                    borderRadius: 6, padding: '4px 10px', fontSize: 11.5,
                    cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
                    opacity: resendLoading ? 0.6 : 1,
                  }}
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
            {resendSent && (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                Verification email sent! Check your inbox.
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email field */}
        <div className="field">
          <label className="field-label">Email address</label>
          <div className="input-wrap">
            <span className="input-icon"><MailIcon /></span>
            <input
              type="email"
              className={`field-input ${emailError ? 'error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(''); }}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          {emailError && (
            <div className="field-error">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {emailError}
            </div>
          )}
        </div>

        {/* Password field */}
        <div className="field">
          <label className="field-label">Password</label>
          <div className="input-wrap">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className={`field-input ${passwordError ? 'error' : ''}`}
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
              autoComplete="current-password"
              disabled={loading}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              <EyeIcon open={showPw} />
            </button>
          </div>
          {passwordError && (
            <div className="field-error">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {passwordError}
            </div>
          )}
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
