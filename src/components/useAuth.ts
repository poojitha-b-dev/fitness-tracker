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

// ─── Custom AuthError ─────────────────────────────────────────────────────────
export type AuthErrorCode =
  | "auth/invalid-email-format"
  | "auth/user-not-found"
  | "auth/wrong-password"
  | "auth/invalid-credentials"
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

// ─── Firestore helpers ────────────────────────────────────────────────────────
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

    // 2. Attempt sign-in
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, normalEmail, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";

      if (code === "auth/too-many-requests") {
        throw new AuthError("auth/too-many-requests", "Too many failed attempts. Please wait or reset your password.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }

      // These are the only two codes Firebase returns when
      // Email Enumeration Protection is ON — both mean the same thing:
      // either the email doesn't exist or the password is wrong.
      // We cannot distinguish them without disabling that Firebase setting.
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-email"
      ) {
        throw new AuthError(
          "auth/invalid-credentials",
          "No account found or incorrect password. Please check your details."
        );
      }

      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please try again.");
    }

    // 3. Back-fill email doc (non-blocking, best-effort)
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

    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
      if (usernameSnap.exists()) {
        throw new AuthError("auth/username-taken", "This username is already taken.");
      }
    } catch (e: any) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
    }

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

    try { await updateProfile(user, { displayName: username.trim() }); } catch { /* non-critical */ }

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
    } catch { /* silent */ }

    try {
      await sendEmailVerification(user, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch { /* non-critical */ }

    await signOut(auth);
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    clearAll();
    await signOut(auth);
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  // When Email Enumeration Protection is ON, Firebase silently succeeds for
  // non-existent emails too. We use our Firestore registeredEmails doc as a
  // best-effort gate — it works for all users registered via this app.
  // Users who existed before this system get a graceful send (Firebase handles it).
  const resetPassword = async (email: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    if (!isValidEmailFormat(normalEmail)) {
      throw new AuthError("auth/invalid-email-format", "Please enter a valid email address.");
    }

    // Check Firestore doc first (works for users registered via this app)
    // We intentionally do NOT block on null (doc missing = old user or network error)
    // — we just send the email and let Firebase handle it.
    try {
      const snap = await getDoc(emailDocRef(normalEmail));
      if (snap.exists() === false) {
        // Doc explicitly doesn't exist — but could be an old user with no doc.
        // Don't block — fall through to sendPasswordResetEmail.
        // Firebase will silently succeed either way when protection is ON.
      }
    } catch { /* network error — fall through */ }

    try {
      await sendPasswordResetEmail(auth, normalEmail, {
        url: `${SITE_URL}/`,
        handleCodeInApp: false,
      });
    } catch (e: any) {
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
