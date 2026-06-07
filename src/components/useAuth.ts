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

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser extends User {
  username?: string;
}

// Custom error codes used internally
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
    this.code = code;
  }
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

// ─── State hook ───────────────────────────────────────────────────────────────
export const useAuthState = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Attach Firestore username to the Firebase user object
  const hydrateUser = async (user: User): Promise<AuthUser> => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) (user as AuthUser).username = snap.data().username;
    } catch { /* silent */ }
    return user as AuthUser;
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Always reload to get the freshest emailVerified flag from Firebase
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

  // Force-refresh user from Firebase (used after email verification)
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
  // Strategy: attempt sign-in first. Map Firebase error codes to our own
  // granular codes. Then gate on emailVerified.
  const login = async (email: string, password: string): Promise<void> => {
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      const code: string = e?.code ?? "";

      // Firebase v9 collapses user-not-found + wrong-password into
      // "invalid-credential" for security. We need to distinguish them.
      if (
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email"
      ) {
        // Try to figure out if the email actually exists by attempting
        // a deliberate wrong-password sign-in with a sentinel value.
        // If Firebase returns invalid-credential again we can't tell,
        // so we check Firestore usernames index as a proxy.
        // Simplest reliable approach: check Firestore users collection.
        try {
          // We query the Firestore "emails" index we maintain on register.
          // If no doc exists → email not registered.
          // Note: we use the usernames collection indirectly via email field.
          // The most reliable way without Admin SDK is to try signing in and
          // inspect the specific code:
          //   - auth/user-not-found  → email doesn't exist (older SDK)
          //   - auth/wrong-password  → email exists, password wrong (older SDK)
          //   - auth/invalid-credential → newer SDK, ambiguous
          // For the newer SDK we store email→uid in Firestore on register.
          const emailsRef = doc(db, "emails", email.toLowerCase().trim());
          const emailSnap = await getDoc(emailsRef);
          if (!emailSnap.exists()) {
            throw new AuthError("auth/user-not-found", "No account found with this email address.");
          } else {
            throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
          }
        } catch (inner: any) {
          if (inner instanceof AuthError) throw inner;
          // Firestore lookup failed — fall back to generic message
          throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
        }
      }

      if (code === "auth/wrong-password") {
        throw new AuthError("auth/wrong-password", "Incorrect password. Please try again.");
      }
      if (code === "auth/too-many-requests") {
        throw new AuthError("auth/too-many-requests", "Too many attempts. Please wait a few minutes or reset your password.");
      }
      if (code === "auth/network-request-failed") {
        throw new AuthError("auth/network-request-failed", "Network error. Please check your connection.");
      }
      throw new AuthError(code, "Sign-in failed. Please try again.");
    }

    // Signed in — now check email verification
    const user = credential.user;
    if (!user.emailVerified) {
      await signOut(auth);
      throw new AuthError("auth/email-not-verified", "Please verify your email before signing in. Check your inbox.");
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, username: string): Promise<void> => {
    const normalEmail    = email.trim().toLowerCase();
    const normalUsername = username.trim().toLowerCase();

    // 1. Check username uniqueness in Firestore
    const usernameSnap = await getDoc(doc(db, "usernames", normalUsername));
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
        throw new AuthError("auth/weak-password", "Password is too weak.");
      }
      if (code === "auth/invalid-email") {
        throw new AuthError("auth/invalid-email", "Please enter a valid email address.");
      }
      throw new AuthError(code, "Registration failed. Please try again.");
    }

    const user = credential.user;

    // 3. Update Firebase Auth profile
    await updateProfile(user, { displayName: username.trim() });

    // 4. Write Firestore user doc
    await setDoc(doc(db, "users", user.uid), {
      uid:           user.uid,
      email:         normalEmail,
      username:      normalUsername,
      displayName:   username.trim(),
      emailVerified: false,
      createdAt:     serverTimestamp(),
    });

    // 5. Username index (for uniqueness checks)
    await setDoc(doc(db, "usernames", normalUsername), { uid: user.uid });

    // 6. Email index (so login can distinguish "no account" vs "wrong password")
    await setDoc(doc(db, "emails", normalEmail), { uid: user.uid });

    // 7. Send verification email — continueUrl brings user back to login page
    await sendEmailVerification(user, {
      url: `${SITE_URL}/`,
      handleCodeInApp: false,
    });

    // 8. Sign out — user MUST verify before entering the app
    await signOut(auth);
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    clearAll();
    await signOut(auth);
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  // Check email exists first, then send reset link with continueUrl
  const resetPassword = async (email: string): Promise<void> => {
    const normalEmail = email.trim().toLowerCase();

    // Check our emails index in Firestore
    const emailSnap = await getDoc(doc(db, "emails", normalEmail));
    if (!emailSnap.exists()) {
      throw new AuthError("auth/user-not-found", "No account found with this email address.");
    }

    await sendPasswordResetEmail(auth, normalEmail, {
      url: `${SITE_URL}/`,       // "Return to MyFitTrackr" link in the email
      handleCodeInApp: false,
    });
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
