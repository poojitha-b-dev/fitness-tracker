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

// ─── Email format validator ────────────────────────────────────────────────────
// Accepts: gmail.com, hotmail.com, outlook.com, yahoo.com, any valid domain
// Rejects: missing @, missing dot in domain, missing TLD, spaces, consecutive dots
export const isValidEmailFormat = (email: string): boolean => {
  // Standard RFC-compliant email regex
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  if (email.includes("..")) return false;          // no consecutive dots
  if (email.startsWith(".") || email.endsWith(".")) return false;
  const [local, domain] = email.split("@");
  if (!local || local.length === 0) return false;
  if (!domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return false;               // TLD must be 2+ chars
  return true;
};

// ─── Custom AuthError class ────────────────────────────────────────────────────
export type AuthErrorCode =
  | "auth/invalid-email-format"
  | "auth/user-not-found"
  | "auth/wrong-password"
  | "auth/email-not-verified"
  | "auth/email-already-in-use"
  | "auth/username-taken"
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

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── Firestore email existence check ──────────────────────────────────────────
// This is the ONLY reliable way with Firebase v10 client SDK.
// Firebase v10 returns auth/invalid-credential for BOTH wrong email and
// wrong password — making it impossible to distinguish via Auth alone.
//
// Solution: we maintain a "registeredEmails/{email}" collection in Firestore.
// On register → write the doc. On login/reset → read the doc first.
// If the doc doesn't exist → email was never registered.
//
// For users who registered before this system: after a successful login
// we back-fill their email doc so future lookups work.
const emailDocRef = (email: string) =>
  doc(db, "registeredEmails", email.replace(/\./g, ","));
  // Firestore doc IDs can't contain dots — replace with comma as safe encoding

const checkEmailRegistered = async (email: string): Promise<boolean> => {
  try {
    const snap = await getDoc(emailDocRef(email));
    return snap.exists();
  } catch {
    // Firestore unreachable — fall back to allowing the attempt
    // (Firebase Auth will give us the real error)
    return true;
  }
};

const writeEmailDoc = async (email: string, uid: string): Promise<void> => {
  try {
    await setDoc(emailDocRef(email), { uid, createdAt: serverTimestamp() });
  } catch { /* non-critical */ }
};

// ─── useAuthState ──────────────────────────────────────────────────────────────
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

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    // 1. Validate email format client-side — catches abc@gmailcom etc.
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Check Firestore — does this email exist in our database?
    const registered = await checkEmailRegistered(normalEmail);
    if (!registered) {
      throw new AuthError("auth/user-not-found", "No account exists with this email address.");
    }

    // 3. Email confirmed in DB — now attempt sign-in
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";
      // Email is confirmed to exist, so any sign-in failure = wrong password
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
      }
      if (code === "auth/too-many-requests") {
        throw new AuthError("auth/too-many-requests", "Too many failed attempts. Please wait or reset your password.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }
      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please try again.");
    }

    // 4. Back-fill email doc for users who registered before this system
    //    (safe no-op if doc already exists since setDoc with merge would overwrite — use only if missing)
    await writeEmailDoc(normalEmail, credential.user.uid);

    // 5. Block unverified users
    const user = credential.user;
    if (!user.emailVerified) {
      await signOut(auth);
      throw new AuthError(
        "auth/email-not-verified",
        "Please verify your email before signing in. Check your inbox."
      );
    }
  };

  // ── REGISTER ────────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, username: string): Promise<void> => {
    const normalEmail    = email.trim().toLowerCase();
    const normalUsername = username.trim().toLowerCase();

    // 1. Validate email format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Check username uniqueness
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
      if (usernameSnap.exists()) {
        throw new AuthError("auth/username-taken", "This username is already taken.");
      }
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
    }

    // 3. Create Firebase Auth account — Firebase itself checks email uniqueness
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

    // 4. Update display name
    try { await updateProfile(user, { displayName: username.trim() }); } catch { /* non-critical */ }

    // 5. Write all Firestore docs
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid:         user.uid,
        email:       normalEmail,
        username:    normalUsername,
        displayName: username.trim(),
        createdAt:   serverTimestamp(),
      });
      await setDoc(doc(db, "usernames", normalUsername), { uid: user.uid });
      // Write the email lookup doc — critical for login/reset checks
      await writeEmailDoc(normalEmail, user.uid);
    } catch { /* silent — auth still works without Firestore */ }

    // 6. Send verification email
    try {
      await sendEmailVerification(user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch { /* non-critical */ }

    // 7. Sign out — must verify before entering app
    await signOut(auth);
  };

  // ── LOGOUT ──────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    clearAll();
    await signOut(auth);
  };

  // ── RESET PASSWORD ──────────────────────────────────────────────────────────
  const resetPassword = async (email: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    // 1. Validate format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Check Firestore — must exist before we send anything
    const registered = await checkEmailRegistered(normalEmail);
    if (!registered) {
      throw new AuthError("auth/user-not-found", "No account exists with this email address.");
    }

    // 3. Email confirmed — send reset link
    try {
      await sendPasswordResetEmail(auth, normalEmail, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch (e: any) {
      const code: string = e?.code ?? "";
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

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
