// src/components/Profile.tsx
import React, { useState } from 'react';
import {
  User, Lock, Save, AlertCircle, CheckCircle,
  Eye, EyeOff, Shield, Calendar, Edit2, Mail,
} from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import {
  updateProfile, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
  sendEmailVerification, sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  isValidUsername, isUsernameAvailable,
  analyzePassword, isPasswordAcceptable,
} from '../utils/validation';

type Section = 'info' | 'username' | 'password' | 'security';

interface AlertState { type: 'success' | 'error'; message: string; }

const EyeIcon = ({ open }: { open: boolean }) => open ? <Eye size={15} /> : <EyeOff size={15} />;

// ─── Main ─────────────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('info');
  if (!currentUser) return null;

  const joinDate = currentUser.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  const navItems: { id: Section; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'info',     label: 'Account Info', icon: User },
    { id: 'username', label: 'Username',     icon: Edit2 },
    { id: 'password', label: 'Password',     icon: Lock },
    { id: 'security', label: 'Security',     icon: Shield },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e2a3a', margin: 0, letterSpacing: '-0.4px' }}>Profile Settings</h1>
        <p style={{ fontSize: 13.5, color: '#7a8fa6', marginTop: 4 }}>Manage your account information and security</p>
      </div>

      {/* Avatar card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: 'white', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}>
            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e2a3a', marginBottom: 2 }}>
              {currentUser.displayName || 'No username set'}
            </div>
            <div style={{ fontSize: 13, color: '#7a8fa6', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.email}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 20, fontSize: 11.5,
              background: currentUser.emailVerified ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${currentUser.emailVerified ? 'rgba(5,150,105,0.25)' : 'rgba(245,158,11,0.25)'}`,
              color: currentUser.emailVerified ? '#065f46' : '#92400e',
            }}>
              <Shield size={10} />
              {currentUser.emailVerified ? 'Email verified' : 'Email not verified'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a0b0c0', flexShrink: 0 }}>
            <Calendar size={12} />Joined {joinDate}
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#eef2ff', borderRadius: 10, padding: 4, border: '1px solid rgba(99,136,247,0.15)' }}>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveSection(id)}
            style={{
              flex: 1, padding: '8px 6px', borderRadius: 7, border: 'none',
              background: activeSection === id ? '#ffffff' : 'transparent',
              color: activeSection === id ? '#3b82f6' : '#7a8fa6',
              cursor: 'pointer', fontSize: 12.5,
              fontWeight: activeSection === id ? 600 : 400,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
              boxShadow: activeSection === id ? '0 1px 4px rgba(99,136,247,0.15)' : 'none',
            }}>
            <Icon size={13} /><span style={{ whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        ))}
      </div>

      {activeSection === 'info'     && <AccountInfoSection user={currentUser} joinDate={joinDate} />}
      {activeSection === 'username' && <ChangeUsernameSection user={currentUser} />}
      {activeSection === 'password' && <ChangePasswordSection />}
      {activeSection === 'security' && <SecuritySection user={currentUser} />}
    </div>
  );
};

// ─── Account Info ─────────────────────────────────────────────────────────────
const AccountInfoSection: React.FC<{ user: any; joinDate: string }> = ({ user, joinDate }) => (
  <div style={cardStyle}>
    <SectionTitle>Account Information</SectionTitle>
    <div style={{ display: 'grid', gap: 0 }}>
      <InfoRow label="Username"       value={user.displayName || '—'} />
      <InfoRow label="Email"          value={user.email || '—'} />
      <InfoRow label="Email Verified" value={user.emailVerified ? 'Yes ✓' : 'No — check your inbox'} />
      <InfoRow label="Member Since"   value={joinDate} />
      <InfoRow label="Last Sign In"   value={user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Unknown'} />
      <InfoRow label="User ID"        value={user.uid} mono last />
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean; last?: boolean }> = ({ label, value, mono, last }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: last ? 'none' : '1px solid #eef2ff' }}>
    <span style={{ fontSize: 13, color: '#7a8fa6', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: mono ? 11 : 13, color: '#3d5068', textAlign: 'right', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
  </div>
);

// ─── Change Username ──────────────────────────────────────────────────────────
const ChangeUsernameSection: React.FC<{ user: any }> = ({ user }) => {
  const [username, setUsername]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [alert, setAlert]               = useState<AlertState | null>(null);
  const [usernameErr, setUsernameErr]   = useState('');
  const [usernameOk, setUsernameOk]     = useState(false);
  const [checking, setChecking]         = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setUsernameOk(false);
    if (!username) { setUsernameErr(''); return; }
    const err = isValidUsername(username);
    if (err) { setUsernameErr(err); return; }
    setUsernameErr(''); setChecking(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const available = await isUsernameAvailable(username);
      setChecking(false);
      if (!available) setUsernameErr('Username already taken.');
      else setUsernameOk(true);
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [username]);

  const handleSave = async () => {
    if (!usernameOk || !username) return;
    setLoading(true); setAlert(null);
    try {
      await updateProfile(auth.currentUser!, { displayName: username.trim() });
      await updateDoc(doc(db, 'users', user.uid), { username: username.toLowerCase(), displayName: username.trim() });
      if (user.displayName) await deleteDoc(doc(db, 'usernames', user.displayName.toLowerCase())).catch(() => {});
      await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid });
      setAlert({ type: 'success', message: 'Username updated! Refresh to see it in the nav.' });
      setUsername(''); setUsernameOk(false);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || 'Failed to update username.' });
    } finally { setLoading(false); }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Change Username</SectionTitle>
      <p style={{ fontSize: 13, color: '#7a8fa6', marginBottom: 18, lineHeight: 1.6 }}>
        Current: <strong style={{ color: '#3d5068' }}>{user.displayName || 'not set'}</strong>
      </p>
      {alert && <AlertBanner type={alert.type} message={alert.message} />}
      <FieldWrap label="New Username">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><User size={14} /></span>
          <input style={{ ...inputStyle, paddingLeft: 36, borderColor: usernameErr ? 'rgba(220,38,38,0.5)' : usernameOk ? 'rgba(5,150,105,0.4)' : undefined }}
            placeholder="new_username" value={username}
            onChange={e => setUsername(e.target.value)} maxLength={20} disabled={loading} />
        </div>
        {checking && <FieldNote color="#a0b0c0">Checking availability…</FieldNote>}
        {!checking && usernameErr && <FieldNote color="#dc2626">✕ {usernameErr}</FieldNote>}
        {!checking && usernameOk  && <FieldNote color="#059669">✓ Username available!</FieldNote>}
      </FieldWrap>
      <SaveButton onClick={handleSave} loading={loading} disabled={!usernameOk}>Save Username</SaveButton>
    </div>
  );
};

// ─── Change Password ──────────────────────────────────────────────────────────
const ChangePasswordSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [alert, setAlert]             = useState<AlertState | null>(null);

  const analysis   = analyzePassword(newPw);
  const confirmErr = confirmPw && confirmPw !== newPw ? 'Passwords do not match.' : '';
  const canSave    = currentPw && newPw && isPasswordAcceptable(newPw) && confirmPw === newPw && !loading;

  const barBg = (i: number) => {
    if (!newPw || analysis.score === 0) return '#e8eeff';
    if (analysis.strength === 'weak')   return i < 2 ? '#ef4444' : '#e8eeff';
    if (analysis.strength === 'medium') return i < 3 ? '#f59e0b' : '#e8eeff';
    return '#10b981';
  };

  const handleSave = async () => {
    if (!canSave) return;
    setAlert(null); setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser!.email!, currentPw);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPw);
      setAlert({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/wrong-password': 'Current password is incorrect.',
        'auth/weak-password':  'New password is too weak.',
        'auth/requires-recent-login': 'Please sign out and sign back in, then try again.',
      };
      setAlert({ type: 'error', message: msgs[(e as FirebaseError).code] || e.message });
    } finally { setLoading(false); }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Change Password</SectionTitle>
      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      <FieldWrap label="Current Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input type={showCurrent ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38 }}
            placeholder="Your current password" value={currentPw}
            onChange={e => setCurrentPw(e.target.value)} disabled={loading} />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowCurrent(p => !p)}><EyeIcon open={showCurrent} /></button>
        </div>
      </FieldWrap>

      <FieldWrap label="New Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input type={showNew ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38 }}
            placeholder="Create a new password" value={newPw}
            onChange={e => setNewPw(e.target.value)} disabled={loading} />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowNew(p => !p)}><EyeIcon open={showNew} /></button>
        </div>
        {newPw && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
              {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: barBg(i), transition: 'background 0.3s' }} />)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, color: analysis.color, fontWeight: 500 }}>{analysis.label}</span>
              {analysis.strength === 'weak' && <span style={{ fontSize: 11, color: '#a0b0c0' }}>Not accepted</span>}
            </div>
            {analysis.tips.length > 0 && (
              <div style={{ fontSize: 11, color: '#a0b0c0', marginTop: 4, lineHeight: 1.6 }}>
                {analysis.tips.map((t, i) => <div key={i}>· {t}</div>)}
              </div>
            )}
          </div>
        )}
      </FieldWrap>

      <FieldWrap label="Confirm New Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input type={showConfirm ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38, borderColor: confirmErr ? 'rgba(220,38,38,0.5)' : confirmPw && !confirmErr ? 'rgba(5,150,105,0.4)' : undefined }}
            placeholder="Repeat your new password" value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)} disabled={loading} />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowConfirm(p => !p)}><EyeIcon open={showConfirm} /></button>
        </div>
        {confirmErr         && <FieldNote color="#dc2626">✕ {confirmErr}</FieldNote>}
        {confirmPw && !confirmErr && <FieldNote color="#059669">✓ Passwords match</FieldNote>}
      </FieldWrap>

      <SaveButton onClick={handleSave} loading={loading} disabled={!canSave}>Update Password</SaveButton>
    </div>
  );
};

// ─── Security (email verification + forgot password) ──────────────────────────
const SecuritySection: React.FC<{ user: any }> = ({ user }) => {
  const [verifyLoading, setVerifyLoading]   = useState(false);
  const [verifyAlert, setVerifyAlert]       = useState<AlertState | null>(null);
  const [resetLoading, setResetLoading]     = useState(false);
  const [resetAlert, setResetAlert]         = useState<AlertState | null>(null);

  const sendVerification = async () => {
    setVerifyLoading(true); setVerifyAlert(null);
    try {
      await sendEmailVerification(auth.currentUser!);
      setVerifyAlert({ type: 'success', message: 'Verification email sent! Check your inbox.' });
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/too-many-requests': 'Too many requests. Please wait a few minutes.',
      };
      setVerifyAlert({ type: 'error', message: msgs[(e as FirebaseError).code] || e.message });
    } finally { setVerifyLoading(false); }
  };

  const sendReset = async () => {
    setResetLoading(true); setResetAlert(null);
    try {
      await sendPasswordResetEmail(auth, user.email!);
      setResetAlert({ type: 'success', message: `Password reset link sent to ${user.email}` });
    } catch (e: any) {
      setResetAlert({ type: 'error', message: 'Failed to send reset email. Try again.' });
    } finally { setResetLoading(false); }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Security</SectionTitle>

      {/* Email Verification */}
      <div style={{ padding: '16px', background: '#f8faff', borderRadius: 12, marginBottom: 16, border: '1px solid #eef2ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Mail size={16} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e2a3a' }}>Email Verification</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: user.emailVerified ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
            color: user.emailVerified ? '#065f46' : '#92400e',
            border: `1px solid ${user.emailVerified ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}>
            {user.emailVerified ? 'Verified' : 'Not verified'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#7a8fa6', marginBottom: 12, lineHeight: 1.5 }}>
          {user.emailVerified
            ? 'Your email address has been verified.'
            : 'Your email is not verified. Verify it to secure your account.'}
        </p>
        {verifyAlert && <AlertBanner type={verifyAlert.type} message={verifyAlert.message} />}
        {!user.emailVerified && (
          <SaveButton onClick={sendVerification} loading={verifyLoading} disabled={verifyLoading}>
            Send Verification Email
          </SaveButton>
        )}
      </div>

      {/* Forgot Password */}
      <div style={{ padding: '16px', background: '#f8faff', borderRadius: 12, border: '1px solid #eef2ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Lock size={16} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e2a3a' }}>Forgot Password</span>
        </div>
        <p style={{ fontSize: 13, color: '#7a8fa6', marginBottom: 12, lineHeight: 1.5 }}>
          Send a password reset link to <strong style={{ color: '#3d5068' }}>{user.email}</strong>
        </p>
        {resetAlert && <AlertBanner type={resetAlert.type} message={resetAlert.message} />}
        <SaveButton onClick={sendReset} loading={resetLoading} disabled={resetLoading}>
          Send Reset Link
        </SaveButton>
      </div>
    </div>
  );
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid rgba(99,136,247,0.12)',
  borderRadius: 16, padding: 24, marginBottom: 16,
  boxShadow: '0 1px 3px rgba(99,136,247,0.08)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8faff', border: '1px solid #dde6ff',
  borderRadius: 10, color: '#1e2a3a', fontFamily: "'DM Sans', sans-serif",
  fontSize: 14, padding: '10px 38px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
const inputIconStyle: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
  color: '#a0b0c0', pointerEvents: 'none', display: 'flex', alignItems: 'center',
};
const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#a0b0c0',
  padding: 2, display: 'flex', alignItems: 'center',
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e2a3a', marginBottom: 18, marginTop: 0 }}>{children}</h2>
);
const FieldWrap: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#5a6f87', marginBottom: 6, letterSpacing: '0.3px' }}>{label}</label>
    {children}
  </div>
);
const FieldNote: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div style={{ fontSize: 11.5, color, marginTop: 5 }}>{children}</div>
);
const AlertBanner: React.FC<{ type: 'success' | 'error'; message: string }> = ({ type, message }) => (
  <div style={{
    borderRadius: 10, padding: '11px 14px', fontSize: 13, marginBottom: 16,
    display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5,
    background: type === 'success' ? 'rgba(5,150,105,0.07)' : 'rgba(220,38,38,0.07)',
    border: `1px solid ${type === 'success' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
    color: type === 'success' ? '#065f46' : '#b91c1c',
  }}>
    {type === 'success' ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
    <span>{message}</span>
  </div>
);
const SaveButton: React.FC<{ onClick: () => void; loading: boolean; disabled: boolean; children: React.ReactNode }> =
  ({ onClick, loading, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '100%', padding: '11px',
    background: disabled ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
    border: 'none', borderRadius: 10, color: 'white',
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'opacity 0.2s', opacity: disabled ? 0.6 : 1,
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(59,130,246,0.25)',
  }}>
    {loading
      ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Saving…</>
      : <><Save size={14} />{children}</>}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </button>
);

export default Profile;
