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

// ─── Firebase project API key (same one used in firebase.ts) ─────────────────
const FIREBASE_API_KEY = "AIzaSyB464UldkUwxEDPgXPfr8OJM7qYOhgpKkw";

// ─── Email format validator ───────────────────────────────────────────────────
export const isValidEmailFormat = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  if (email.includes("..")) return false;
  if (email.startsWith(".") || email.endsWith(".")) return false;
  const [local, domain] = email.split("@");
  if (!local || local.length === 0) return false;
  if (!domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return false;
  return true;
};

// ─── Reliable email existence check via Firebase Auth REST API ────────────────
//
// Firebase v10 client SDK returns auth/invalid-credential for BOTH wrong email
// AND wrong password — making it impossible to distinguish client-side.
//
// Firebase's createAuthUri REST endpoint tells us which sign-in providers are
// registered for a given email WITHOUT requiring authentication. This works for
// ALL users (including those registered before any Firestore doc system).
//
// Returns: true  → email IS registered in Firebase Auth
//          false → email is NOT registered
//          null  → network/API error (treat as unknown, don't block the user)
const checkEmailExistsInFirebase = async (email: string): Promise<boolean | null> => {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          continueUri: SITE_URL,
        }),
      }
    );
    if (!res.ok) return null; // API error — be safe, don't block
    const data = await res.json();
    // registered: true if the email has at least one sign-in provider
    return Array.isArray(data.allProviders)
      ? data.allProviders.length > 0
      : data.registered === true;
  } catch {
    return null; // Network error — be safe
  }
};

// ─── Custom AuthError class ───────────────────────────────────────────────────
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

// ─── Firestore helpers (kept for back-compat, non-critical) ──────────────────
const emailDocRef = (email: string) =>
  doc(db, "registeredEmails", email.replace(/\./g, ","));

const writeEmailDoc = async (email: string, uid: string): Promise<void> => {
  try {
    await setDoc(emailDocRef(email), { uid, createdAt: serverTimestamp() });
  } catch { /* non-critical */ }
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

    // 1. Validate email format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Attempt Firebase sign-in
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";

      // Still handle legacy unambiguous codes (older SDK / emulator)
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        throw new AuthError("auth/user-not-found", "No account exists with this email address.");
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

      // Firebase v10: auth/invalid-credential is ambiguous —
      // use the REST API to check if the email actually exists
      if (code === "auth/invalid-credential") {
        const exists = await checkEmailExistsInFirebase(normalEmail);

        if (exists === false) {
          // Definitively not registered
          throw new AuthError("auth/user-not-found", "No account exists with this email address.");
        }
        if (exists === true) {
          // Email is registered → must be wrong password
          throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
        }
        // exists === null → REST API failed (network issue); give neutral error
        throw new AuthError("auth/unknown", "Sign-in failed. Please check your details and try again.");
      }

      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please try again.");
    }

    // 3. Back-fill email doc for existing users (non-blocking, best-effort)
    writeEmailDoc(normalEmail, credential.user.uid);

    // 4. Block unverified users
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

    // 1. Validate email format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Check username uniqueness in Firestore
    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
      if (usernameSnap.exists()) {
        throw new AuthError("auth/username-taken", "This username is already taken.");
      }
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
    }

    // 3. Create Firebase Auth account
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
      await writeEmailDoc(normalEmail, user.uid);
    } catch { /* silent — auth still works without Firestore */ }

    // 6. Send verification email
    try {
      await sendEmailVerification(user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch { /* non-critical */ }

    // 7. Sign out — user must verify before entering the app
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

    // 1. Validate format
    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // 2. Check if email is actually registered BEFORE sending the reset email.
    //    We check first so we never send to non-existent addresses.
    //    Use the REST API — works for ALL users including existing ones.
    const exists = await checkEmailExistsInFirebase(normalEmail);

    if (exists === false) {
      // Definitively not registered — don't send email
      throw new AuthError("auth/user-not-found", "No account exists with this email address.");
    }
    // exists === null means the REST check failed (network). We'll still attempt
    // to send — Firebase will handle it gracefully.

    // 3. Send reset email
    try {
      await sendPasswordResetEmail(auth, normalEmail, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      const code: string = e?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        throw new AuthError("auth/user-not-found", "No account exists with this email address.");
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
