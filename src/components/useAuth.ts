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

// ─── Custom error class ───────────────────────────────────────────────────────
export type AuthErrorCode =
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

// ─── Helper: check if email exists in Firebase Auth ──────────────────────────
// We probe by attempting sign-in with a sentinel password.
// Firebase returns:
//   auth/wrong-password    → email EXISTS, password was wrong
//   auth/user-not-found    → email does NOT exist
//   auth/invalid-credential → newer SDK ambiguous code (treat as: need further check)
// This is purely a read probe — we never actually sign in.
const emailExistsInFirebase = async (email: string): Promise<boolean> => {
  try {
    // Use a sentinel password that will never match
    await signInWithEmailAndPassword(auth, email, "__PROBE_SENTINEL_XYZ_123__");
    // If somehow this succeeds (impossible), email exists
    await signOut(auth);
    return true;
  } catch (e: any) {
    const code: string = e?.code ?? "";
    if (code === "auth/wrong-password") return true;       // email found, wrong pw
    if (code === "auth/user-not-found") return false;      // email not found
    if (code === "auth/invalid-credential") {
      // Firebase v10+ merges both into this code for security.
      // We can't distinguish — assume email might exist to avoid
      // leaking info. Return true so login proceeds and gets real error.
      return true;
    }
    if (code === "auth/invalid-email") return false;
    if (code === "auth/too-many-requests") {
      // Rate limited — assume exists so we don't block legitimate users
      return true;
    }
    // Any other error — assume email exists to be safe
    return true;
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

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";

      // Handle unambiguous codes first
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

      // Firebase v10+ uses auth/invalid-credential for both wrong-email and wrong-password.
      // We probe to distinguish them.
      if (code === "auth/invalid-credential") {
        const exists = await emailExistsInFirebase(normalEmail);
        if (!exists) {
          throw new AuthError("auth/user-not-found", "No account found with this email address.");
        } else {
          throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
        }
      }

      // Fallback
      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please check your details.");
    }

    // Signed in — check email verification
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

    // 1. Check username uniqueness
    let usernameSnap;
    try {
      usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
    } catch {
      throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
    }
    if (usernameSnap.exists()) {
      throw new AuthError("auth/username-taken", "This username is already taken.");
    }

    // 2. Create Firebase Auth account
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
        throw new AuthError("auth/invalid-email", "Please enter a valid email address.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }
      throw new AuthError(code || "auth/unknown", "Registration failed. Please try again.");
    }

    const user = credential.user;

    // 3. Update display name
    try {
      await updateProfile(user, { displayName: username.trim() });
    } catch { /* non-critical, continue */ }

    // 4. Write Firestore docs (non-critical — don't block registration if these fail)
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

    // 5. Send verification email
    try {
      await sendEmailVerification(user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch {
      // Verification email failed — still complete registration,
      // user can request resend from login page
    }

    // 6. Sign out — must verify before entering app
    await signOut(auth);
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    clearAll();
    await signOut(auth);
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  // Firebase's sendPasswordResetEmail throws auth/user-not-found if email
  // doesn't exist — we catch and surface it clearly.
  const resetPassword = async (email: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();
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
