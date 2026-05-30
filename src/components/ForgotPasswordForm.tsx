// src/components/ForgotPasswordForm.tsx
import React, { useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "./useAuth";                   // same folder
import { isValidEmail } from "../utils/validation";    // up one → utils/
import type { AuthView } from "../hooks/AuthPage";     // up one → hooks/

// ─── Icons ───────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const AlertIcon = () => (
  <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const getFirebaseError = (code: string): string => {
  const map: Record<string, string> = {
    "auth/user-not-found":        "No account found with this email address.",
    "auth/invalid-email":         "Please enter a valid email address.",
    "auth/too-many-requests":     "Too many requests. Please wait and try again.",
    "auth/network-request-failed":"Network error. Please check your connection.",
  };
  return map[code] ?? "Could not send reset email. Please try again.";
};

interface Props { onSwitch: (view: AuthView) => void; }

const ForgotPasswordForm: React.FC<Props> = ({ onSwitch }) => {
  const { resetPassword } = useAuth();

  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      if (code === "auth/user-not-found") {
        setSent(true); // Prevents email enumeration
      } else {
        setError(getFirebaseError(code));
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="verify-banner">
        <div className="verify-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <div className="verify-title">Reset email sent</div>
        <p className="verify-text">
          If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.<br /><br />
          Check your spam folder if you don't see it.
        </p>
        <button className="submit-btn" style={{ marginTop: 0 }} onClick={() => onSwitch("login")}>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => onSwitch("login")}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "#6b7280", fontSize: "13px", padding: "0",
          marginBottom: "20px", fontFamily: "inherit",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
        onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
      >
        <BackIcon /> Back to sign in
      </button>

      <h1 className="form-title">Reset password</h1>
      <p className="form-subtitle" style={{ marginBottom: "24px" }}>
        Enter your account email and we'll send you a link to reset your password.
      </p>

      {error && (
        <div className="alert alert-error">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label">Email address</label>
          <div className="input-wrap">
            <span className="input-icon"><MailIcon /></span>
            <input
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{ marginTop: "8px" }}
          disabled={loading || !email.trim()}
        >
          {loading ? (
            <><span className="spinner" />Sending…</>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
