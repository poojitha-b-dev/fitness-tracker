// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth, AuthError, SITE_URL } from './useAuth';
import type { AuthView } from '../hooks/AuthPage';

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
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

interface Props { onSwitch: (view: AuthView) => void; }

const LoginForm: React.FC<Props> = ({ onSwitch }) => {
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const [emailErr, setEmailErr]       = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [bannerErr, setBannerErr]     = useState('');
  const [unverified, setUnverified]   = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]   = useState(false);

  const clearErrors = () => {
    setEmailErr(''); setPasswordErr(''); setBannerErr('');
    setUnverified(false); setResendSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!email.trim()) { setEmailErr('Please enter your email address.'); return; }
    if (!password)     { setPasswordErr('Please enter your password.'); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const code: string = err instanceof AuthError ? err.code : (err?.code ?? '');

      if (code === 'auth/invalid-email-format' || code === 'auth/invalid-email') {
        setEmailErr('Please enter a valid email address (e.g. name@example.com).');
      } else if (code === 'auth/invalid-credentials') {
        // Firebase Email Enumeration Protection is ON — can't distinguish
        // "wrong email" from "wrong password", so we show both fields as potentially wrong.
        setEmailErr('No account found with this email, or the password is incorrect.');
        setPasswordErr('Please double-check and try again, or reset your password below.');
      } else if (code === 'auth/user-not-found') {
        setEmailErr('No account found with this email address.');
      } else if (code === 'auth/wrong-password') {
        setPasswordErr('Incorrect password. Please try again.');
      } else if (code === 'auth/email-not-verified') {
        setUnverified(true);
        setBannerErr('Your email is not verified yet. Check your inbox for the verification link.');
      } else if (code === 'auth/too-many-requests') {
        setBannerErr('Too many failed attempts. Please wait a few minutes or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setBannerErr('Network error. Please check your connection.');
      } else {
        setBannerErr('Sign-in failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || !password) {
      setBannerErr('Please fill in your email and password above first.');
      return;
    }
    setResendLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(cred.user, { url: `${SITE_URL}/`, handleCodeInApp: false });
      await signOut(auth);
      setResendSent(true);
      setBannerErr('');
      setUnverified(false);
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
        Don't have an account? <span onClick={() => onSwitch('register')}>Create one</span>
      </p>

      {(bannerErr || resendSent) && (
        <div className={`alert ${resendSent ? 'alert-success' : 'alert-error'}`}>
          <AlertIcon />
          <div style={{ flex: 1 }}>
            <span>{resendSent ? 'Verification email sent! Check your inbox, then sign in.' : bannerErr}</span>
            {unverified && !resendSent && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResend}
                  style={{
                    background: 'none', border: '1px solid currentColor', borderRadius: 6,
                    padding: '3px 10px', fontSize: 11.5,
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                    color: 'inherit', fontFamily: 'inherit', opacity: resendLoading ? 0.6 : 1,
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
          {emailErr && <div className="field-error"><XIcon />{emailErr}</div>}
        </div>

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
          {passwordErr && <div className="field-error"><XIcon />{passwordErr}</div>}
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
