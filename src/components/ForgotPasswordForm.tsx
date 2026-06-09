// src/components/ForgotPasswordForm.tsx
import React, { useState } from 'react';
import { useAuth, AuthError, isValidEmailFormat } from './useAuth';
import type { AuthView } from '../hooks/AuthPage';

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

interface Props { onSwitch: (view: AuthView) => void; }

const ForgotPasswordForm: React.FC<Props> = ({ onSwitch }) => {
  const { resetPassword } = useAuth();

  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [bannerErr, setBannerErr] = useState('');
  const [sent, setSent]           = useState(false);

  // Button is enabled only when email looks valid
  const emailValid = email.trim().length > 0 && isValidEmailFormat(email.trim().toLowerCase());

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailErr('');
    setBannerErr('');
  };

  const handleEmailBlur = () => {
    if (email.trim() && !isValidEmailFormat(email.trim().toLowerCase())) {
      setEmailErr('Enter a valid email address.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr(''); setBannerErr('');

    if (!email.trim()) {
      setEmailErr('Please enter your email address.');
      return;
    }
    if (!isValidEmailFormat(email.trim().toLowerCase())) {
      setEmailErr('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // resetPassword now checks Firestore first and throws auth/user-not-found
      // if no account is registered — no reset email is sent to unknown addresses.
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      const code: string = err instanceof AuthError ? err.code : (err?.code ?? '');

      if (code === 'auth/invalid-email-format' || code === 'auth/invalid-email') {
        // Field-level
        setEmailErr('Enter a valid email address.');
      } else if (code === 'auth/user-not-found') {
        // Field-level — account not registered
        setEmailErr('Account not found.');
      } else if (code === 'auth/too-many-requests') {
        setBannerErr('Too many requests. Please wait a few minutes and try again.');
      } else if (code === 'auth/network-request-failed') {
        setBannerErr('Network error. Please check your connection.');
      } else {
        setBannerErr('Could not send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="verify-banner">
        <div className="verify-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <div className="verify-title">Check your inbox</div>
        <p className="verify-text">
          A password reset link has been sent to<br /><strong>{email}</strong>
        </p>
        <p className="verify-text" style={{ marginTop: -12 }}>
          Click the link to reset your password.
        </p>
        <p className="verify-text" style={{ fontSize: '12px', opacity: 0.65, marginTop: -12 }}>
          Can't find it? Check your spam folder.
        </p>
        <button className="submit-btn" style={{ marginTop: 0 }} onClick={() => onSwitch('login')}>
          Back to Sign In
        </button>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        onClick={() => onSwitch('login')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7a8fa6', fontSize: 13, padding: 0, marginBottom: 20,
          fontFamily: 'inherit', transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#3b82f6')}
        onMouseLeave={e => (e.currentTarget.style.color = '#7a8fa6')}>
        <BackIcon /> Back to sign in
      </button>

      <h1 className="form-title">Reset password</h1>
      <p className="form-subtitle" style={{ marginBottom: 24 }}>
        Enter your account email and we'll send you a reset link.
      </p>

      {bannerErr && (
        <div className="alert alert-error"><AlertIcon /><span>{bannerErr}</span></div>
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
              onChange={e => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>
          {emailErr && <div className="field-error"><XIcon />{emailErr}</div>}
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{ marginTop: 8 }}
          disabled={loading || !emailValid}>
          {loading ? <><span className="spinner" />Sending…</> : 'Send reset link'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
