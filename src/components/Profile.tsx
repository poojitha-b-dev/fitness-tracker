// src/components/Profile.tsx
import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  Edit2,
} from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from './useAuth';
import { isValidEmail, isValidUsername, isUsernameAvailable, analyzePassword, isPasswordAcceptable } from '../utils/validation';

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'info' | 'username' | 'email' | 'password';

interface AlertState {
  type: 'success' | 'error';
  message: string;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
const EyeIcon = ({ open }: { open: boolean }) =>
  open ? <Eye size={15} /> : <EyeOff size={15} />;

// ─── Main Component ───────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('info');

  if (!currentUser) return null;

  const joinDate = currentUser.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'Unknown';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ecfdf5', margin: 0, letterSpacing: '-0.4px' }}>
          Profile Settings
        </h1>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 4 }}>
          Manage your account information and security
        </p>
      </div>

      {/* Avatar + Account Info card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: 'white',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(16,185,129,0.3)',
          }}>
            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ecfdf5', marginBottom: 2 }}>
              {currentUser.displayName || 'No username set'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 10px',
                borderRadius: 20,
                background: currentUser.emailVerified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${currentUser.emailVerified ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                fontSize: 11.5,
                color: currentUser.emailVerified ? '#34d399' : '#fbbf24',
              }}>
                <Shield size={10} />
                {currentUser.emailVerified ? 'Email verified' : 'Email not verified'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4b5563', flexShrink: 0 }}>
            <Calendar size={12} />
            Joined {joinDate}
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { id: 'info',     label: 'Account Info', icon: User },
          { id: 'username', label: 'Username',     icon: Edit2 },
          { id: 'email',    label: 'Email',        icon: Mail },
          { id: 'password', label: 'Password',     icon: Lock },
        ] as { id: Section; label: string; icon: React.ComponentType<any> }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 7,
              border: 'none',
              background: activeSection === id ? 'rgba(16,185,129,0.14)' : 'transparent',
              color: activeSection === id ? '#34d399' : '#6b7280',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: activeSection === id ? 600 : 400,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} />
            <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Sections */}
      {activeSection === 'info'     && <AccountInfoSection user={currentUser} joinDate={joinDate} />}
      {activeSection === 'username' && <ChangeUsernameSection user={currentUser} />}
      {activeSection === 'email'    && <ChangeEmailSection user={currentUser} />}
      {activeSection === 'password' && <ChangePasswordSection />}
    </div>
  );
};

// ─── Account Info ─────────────────────────────────────────────────────────────
const AccountInfoSection: React.FC<{ user: any; joinDate: string }> = ({ user, joinDate }) => (
  <div style={cardStyle}>
    <SectionTitle>Account Information</SectionTitle>
    <div style={{ display: 'grid', gap: 14 }}>
      <InfoRow label="Username" value={user.displayName || '—'} />
      <InfoRow label="Email" value={user.email || '—'} />
      <InfoRow label="User ID" value={user.uid} mono />
      <InfoRow label="Email Verified" value={user.emailVerified ? 'Yes ✓' : 'No — check your inbox'} />
      <InfoRow label="Member Since" value={joinDate} />
      <InfoRow
        label="Last Sign In"
        value={user.metadata?.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).toLocaleString()
          : 'Unknown'}
      />
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 13, color: '#d1d5db', textAlign: 'right', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 11 : 13 }}>
      {value}
    </span>
  </div>
);

// ─── Change Username ──────────────────────────────────────────────────────────
const ChangeUsernameSection: React.FC<{ user: any }> = ({ user }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [alert, setAlert]       = useState<AlertState | null>(null);
  const [usernameErr, setUsernameErr]   = useState('');
  const [usernameOk, setUsernameOk]     = useState(false);
  const [checking, setChecking]         = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setUsernameOk(false);
    if (!username) { setUsernameErr(''); return; }
    const err = isValidUsername(username);
    if (err) { setUsernameErr(err); return; }
    setUsernameErr('');
    setChecking(true);
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
    setLoading(true);
    setAlert(null);
    try {
      // Update Firebase Auth display name
      await updateProfile(auth.currentUser!, { displayName: username.trim() });

      // Update Firestore user doc
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.toLowerCase(),
        displayName: username.trim(),
      });

      // Update username index — delete old, add new
      if (user.displayName) {
        await deleteDoc(doc(db, 'usernames', user.displayName.toLowerCase())).catch(() => {});
      }
      await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid });

      setAlert({ type: 'success', message: 'Username updated successfully! Refresh to see changes in the nav.' });
      setUsername('');
      setUsernameOk(false);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || 'Failed to update username.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Change Username</SectionTitle>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.6 }}>
        Current username: <strong style={{ color: '#9ca3af' }}>{user.displayName || 'not set'}</strong>
      </p>

      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      <FieldWrap label="New Username">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><User size={14} /></span>
          <input
            style={{ ...inputStyle, paddingLeft: 36, borderColor: usernameErr ? 'rgba(239,68,68,0.5)' : usernameOk ? 'rgba(52,211,153,0.4)' : undefined }}
            placeholder="new_username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
            disabled={loading}
          />
        </div>
        {checking && <FieldNote color="#6b7280">Checking availability…</FieldNote>}
        {!checking && usernameErr && <FieldNote color="#f87171">✕ {usernameErr}</FieldNote>}
        {!checking && usernameOk  && <FieldNote color="#34d399">✓ Username available!</FieldNote>}
      </FieldWrap>

      <SaveButton onClick={handleSave} loading={loading} disabled={!usernameOk}>
        Save Username
      </SaveButton>
    </div>
  );
};

// ─── Change Email ─────────────────────────────────────────────────────────────
const ChangeEmailSection: React.FC<{ user: any }> = ({ user }) => {
  const [newEmail, setNewEmail]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [emailErr, setEmailErr]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [alert, setAlert]             = useState<AlertState | null>(null);

  const handleSave = async () => {
    setAlert(null);
    if (!isValidEmail(newEmail)) { setEmailErr('Please enter a valid email.'); return; }
    if (!password) { setAlert({ type: 'error', message: 'Please enter your current password to confirm.' }); return; }
    setLoading(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Update email
      await updateEmail(auth.currentUser!, newEmail.trim().toLowerCase());

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), { email: newEmail.trim().toLowerCase() });

      setAlert({ type: 'success', message: 'Email updated. A verification email has been sent to your new address.' });
      setNewEmail(''); setPassword('');
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already in use by another account.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/requires-recent-login': 'Please sign out and sign back in, then try again.',
      };
      setAlert({ type: 'error', message: msg[(e as FirebaseError).code] || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Change Email</SectionTitle>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.6 }}>
        Current email: <strong style={{ color: '#9ca3af' }}>{user.email}</strong>
      </p>

      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      <FieldWrap label="New Email Address">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Mail size={14} /></span>
          <input
            type="email"
            style={{ ...inputStyle, paddingLeft: 36, borderColor: emailErr ? 'rgba(239,68,68,0.5)' : undefined }}
            placeholder="new@example.com"
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setEmailErr(''); }}
            onBlur={() => { if (newEmail && !isValidEmail(newEmail)) setEmailErr('Invalid email.'); }}
            disabled={loading}
          />
        </div>
        {emailErr && <FieldNote color="#f87171">✕ {emailErr}</FieldNote>}
      </FieldWrap>

      <FieldWrap label="Current Password (to confirm)">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input
            type={showPw ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38 }}
            placeholder="Your current password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowPw(p => !p)}>
            <EyeIcon open={showPw} />
          </button>
        </div>
      </FieldWrap>

      <SaveButton onClick={handleSave} loading={loading} disabled={!newEmail || !password}>
        Save Email
      </SaveButton>
    </div>
  );
};

// ─── Change Password ──────────────────────────────────────────────────────────
const ChangePasswordSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [alert, setAlert]           = useState<AlertState | null>(null);

  const analysis = analyzePassword(newPw);
  const confirmErr = confirmPw && confirmPw !== newPw ? 'Passwords do not match.' : '';
  const canSave = currentPw && newPw && isPasswordAcceptable(newPw) && confirmPw === newPw && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setAlert(null);
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser!.email!, currentPw);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPw);
      setAlert({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/wrong-password': 'Current password is incorrect.',
        'auth/weak-password': 'New password is too weak.',
        'auth/requires-recent-login': 'Please sign out and sign back in, then try again.',
      };
      setAlert({ type: 'error', message: msg[(e as FirebaseError).code] || e.message });
    } finally {
      setLoading(false);
    }
  };

  // Strength bar helper
  const barClass = (idx: number) => {
    if (!newPw || analysis.score === 0) return 'rgba(255,255,255,0.07)';
    if (analysis.strength === 'weak')   return idx < 2 ? '#ef4444' : 'rgba(255,255,255,0.07)';
    if (analysis.strength === 'medium') return idx < 3 ? '#f59e0b' : 'rgba(255,255,255,0.07)';
    return '#10b981';
  };

  return (
    <div style={cardStyle}>
      <SectionTitle>Change Password</SectionTitle>
      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      <FieldWrap label="Current Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input
            type={showCurrent ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38 }}
            placeholder="Your current password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            disabled={loading}
          />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowCurrent(p => !p)}>
            <EyeIcon open={showCurrent} />
          </button>
        </div>
      </FieldWrap>

      <FieldWrap label="New Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input
            type={showNew ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38 }}
            placeholder="Create a new password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            disabled={loading}
          />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowNew(p => !p)}>
            <EyeIcon open={showNew} />
          </button>
        </div>
        {newPw && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: barClass(i), transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, color: analysis.color, fontWeight: 500 }}>{analysis.label}</span>
              {analysis.strength === 'weak' && <span style={{ fontSize: 11, color: '#6b7280' }}>Not accepted</span>}
            </div>
            {analysis.tips.length > 0 && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.6 }}>
                {analysis.tips.map((t, i) => <div key={i}>· {t}</div>)}
              </div>
            )}
          </div>
        )}
      </FieldWrap>

      <FieldWrap label="Confirm New Password">
        <div style={{ position: 'relative' }}>
          <span style={inputIconStyle}><Lock size={14} /></span>
          <input
            type={showConfirm ? 'text' : 'password'}
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 38, borderColor: confirmErr ? 'rgba(239,68,68,0.5)' : confirmPw && !confirmErr ? 'rgba(52,211,153,0.4)' : undefined }}
            placeholder="Repeat your new password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            disabled={loading}
          />
          <button type="button" style={eyeBtnStyle} onClick={() => setShowConfirm(p => !p)}>
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {confirmErr && <FieldNote color="#f87171">✕ {confirmErr}</FieldNote>}
        {confirmPw && !confirmErr && <FieldNote color="#34d399">✓ Passwords match</FieldNote>}
      </FieldWrap>

      <SaveButton onClick={handleSave} loading={loading} disabled={!canSave}>
        Update Password
      </SaveButton>
    </div>
  );
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#e5e7eb',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  padding: '10px 38px 10px 38px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
  color: '#4b5563', pointerEvents: 'none', display: 'flex', alignItems: 'center',
};

const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563',
  padding: 2, display: 'flex', alignItems: 'center',
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#ecfdf5', marginBottom: 18, marginTop: 0 }}>
    {children}
  </h2>
);

const FieldWrap: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.3px' }}>
      {label}
    </label>
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
    background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
    color: type === 'success' ? '#6ee7b7' : '#fca5a5',
  }}>
    {type === 'success' ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
    <span>{message}</span>
  </div>
);

const SaveButton: React.FC<{
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ onClick, loading, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', padding: '11px',
      background: disabled ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10b981,#059669)',
      border: 'none', borderRadius: 10, color: 'white',
      fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'opacity 0.2s',
      opacity: disabled ? 0.5 : 1,
      boxShadow: disabled ? 'none' : '0 4px 16px rgba(16,185,129,0.25)',
    }}
  >
    {loading ? (
      <>
        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
        Saving…
      </>
    ) : (
      <><Save size={14} />{children}</>
    )}
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </button>
);

export default Profile;
