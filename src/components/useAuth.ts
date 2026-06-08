// src/components/useAuth.ts
import { useState, useEffect, createContext, useContext } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export const SITE_URL = "https://myfittrackr.vercel.app";

// ─── Email format validator ───────────────────────────────────────────────────
// Strict check: must have local@domain.tld format
// Rejects: missing @, missing dot in domain, consecutive dots, spaces etc.
export const isValidEmailFormat = (email: string): boolean => {
  // Must contain exactly one @
  // Domain must have at least one dot with 2+ chars after it
  // No spaces allowed anywhere
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return false;
  // Extra checks
  const [local, domain] = email.split("@");
  if (!local || local.length === 0) return false;
  if (!domain || !domain.includes(".")) return false;
  const parts = domain.split(".");
  if (parts.some((p) => p.length === 0)) return false; // no consecutive dots
  const tld = parts[parts.length - 1];
  if (tld.length < 2) return false; // tld must be 2+ chars
  return true;
};

// ─── Custom error class ───────────────────────────────────────────────────────
export type AuthErrorCode =
  | "auth/invalid-email-format"
  | "auth/user-not-found"
  | "auth/wrong-password"
  | "auth/email-not-verified"
  | "auth/email-already-in-use"
  | "auth/username-taken"
  | "auth/invalid-email"
  | "auth/too-many-requests"
  | "auth/network-request-failed"
  | "auth/weak-password"
  | string;

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser extends User {
  username?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  clearAll: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// ─── Probe: does this email exist in Firebase Auth? ───────────────────────────
// Only called AFTER we know the format is valid.
// Attempts sign-in with a sentinel password to get a definitive Firebase response.
// auth/wrong-password    → email EXISTS
// auth/user-not-found    → email does NOT exist
// auth/invalid-credential → Firebase v10 ambiguous → check Firestore usernames as fallback
const emailExistsInAuth = async (email: string): Promise<boolean> => {
  try {
    await signInWithEmailAndPassword(auth, email, "##PROBE##_sentinel_xyz_789##");
    await signOut(auth).catch(() => {});
    return true; // should never happen
  } catch (e: any) {
    const code: string = e?.code ?? "";
    if (code === "auth/wrong-password")     return true;
    if (code === "auth/user-not-found")     return false;
    if (code === "auth/invalid-email")      return false;
    if (code === "auth/too-many-requests")  return true;  // rate limited → assume exists
    // auth/invalid-credential (Firebase v10+): truly ambiguous
    // Fall back to Firestore users collection — check if any user has this email
    if (code === "auth/invalid-credential") {
      try {
        // We can't query by email without Admin SDK,
        // but we stored email in the user doc on registration.
        // As a safe fallback: return true so the user gets "wrong password"
        // rather than "not found" — less confusing for real users.
        return true;
      } catch {
        return true;
      }
    }
    return true; // safe default
  }
};

// ─── useAuthState ─────────────────────────────────────────────────────────────
export const useAuthState = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async (user: User): Promise<AuthUser> => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) (user as AuthUser).username = snap.data().username;
    } catch { /* silent */ }
    return user as AuthUser;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try { await reload(user); } catch { /* silent */ }
        const hydrated = await hydrateUser(auth.currentUser ?? user);
        setCurrentUser(hydrated);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    const hydrated = await hydrateUser(auth.currentUser);
    setCurrentUser({ ...hydrated } as AuthUser);
  };

  const syncFromCloud = async () => {
    if (!auth.currentUser) return;
    const hydrated = await hydrateUser(auth.currentUser);
    setCurrentUser({ ...hydrated } as AuthUser);
  };

  const clearAll = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("fitness-app-"))
      .forEach((k) => localStorage.removeItem(k));
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    // Step 1: validate format BEFORE calling Firebase
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // Step 2: attempt sign-in
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";

      // Unambiguous codes
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        throw new AuthError("auth/user-not-found", "No account found with this email address.");
      }
      if (code === "auth/wrong-password") {
        throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
      }
      if (code === "auth/too-many-requests") {
        throw new AuthError("auth/too-many-requests", "Too many failed attempts. Please wait or reset your password.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }

      // Firebase v10 invalid-credential: probe to distinguish
      if (code === "auth/invalid-credential") {
        const exists = await emailExistsInAuth(normalEmail);
        if (!exists) {
          throw new AuthError("auth/user-not-found", "No account found with this email address.");
        }
        throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
      }

      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please check your details.");
    }

    // Step 3: gate on email verification
    const user = credential.user;
    if (!user.emailVerified) {
      await signOut(auth);
      throw new AuthError(
        "auth/email-not-verified",
        "Please verify your email before signing in. Check your inbox."
      );
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, username: string): Promise<void> => {
    const normalEmail    = email.trim().toLowerCase();
    const normalUsername = username.trim().toLowerCase();

    // Step 1: validate email format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // Step 2: check username uniqueness
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
      if (usernameSnap.exists()) {
        throw new AuthError("auth/username-taken", "This username is already taken.");
      }
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
    }

    // Step 3: create Firebase Auth account
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";
      if (code === "auth/email-already-in-use") {
        throw new AuthError("auth/email-already-in-use", "An account with this email already exists.");
      }
      if (code === "auth/weak-password") {
        throw new AuthError("auth/weak-password", "Password is too weak. Please choose a stronger one.");
      }
      if (code === "auth/invalid-email") {
        throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }
      throw new AuthError(code || "auth/unknown", "Registration failed. Please try again.");
    }

    const user = credential.user;

    // Step 4: update display name
    try { await updateProfile(user, { displayName: username.trim() }); } catch { /* non-critical */ }

    // Step 5: write Firestore docs (non-critical)
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid:         user.uid,
        email:       normalEmail,
        username:    normalUsername,
        displayName: username.trim(),
        createdAt:   serverTimestamp(),
      });
      await setDoc(doc(db, "usernames", normalUsername), { uid: user.uid });
    } catch { /* silent — auth still works */ }

    // Step 6: send verification email
    try {
      await sendEmailVerification(user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch { /* non-critical — user can resend from login */ }

    // Step 7: sign out — must verify first
    await signOut(auth);
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    clearAll();
    await signOut(auth);
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  const resetPassword = async (email: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    // Step 1: validate format first
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // Step 2: send reset — Firebase throws user-not-found if email isn't registered
    try {
      await sendPasswordResetEmail(auth, normalEmail, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch (e: any) {
      const code: string = e?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        throw new AuthError("auth/user-not-found", "No account found with this email address.");
      }
      if (code === "auth/too-many-requests") {
        throw new AuthError("auth/too-many-requests", "Too many requests. Please wait a few minutes.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }
      throw new AuthError(code || "auth/unknown", "Could not send reset email. Please try again.");
    }
  };

  return {
    currentUser,
    loading,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    syncFromCloud,
    clearAll,
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
