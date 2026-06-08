// src/components/useAuth.ts
import { useState, useEffect, createContext, useContext } from "react";
import {
  User, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  sendEmailVerification, updateProfile, reload,
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
  if (!local) return false;
  if (!domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return false;

  // Block disposable domains
  const blocked = [
    "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
    "yopmail.com","trashmail.com","dispostable.com","maildrop.cc",
    "fakeinbox.com","spam4.me","getairmail.com","discard.email",
  ];
  if (blocked.includes(domain.toLowerCase())) return false;
  return true;
};

// ─── Custom AuthError ─────────────────────────────────────────────────────────
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
  | "auth/ambiguous-credentials"
  | string;

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthUser extends User { username?: string; }

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

const writeEmailDoc = async (email: string, uid: string) => {
  try { await setDoc(emailDocRef(email), { uid, createdAt: serverTimestamp() }); }
  catch { /* non-critical */ }
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
    setCurrentUser({ ...await hydrateUser(auth.currentUser) } as AuthUser);
  };

  const syncFromCloud = async () => {
    if (!auth.currentUser) return;
    setCurrentUser({ ...await hydrateUser(auth.currentUser) } as AuthUser);
  };

  const clearAll = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith("fitness-app-"))
      .forEach(k => localStorage.removeItem(k));
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const e = email.trim().toLowerCase();

    if (!isValidEmailFormat(e))
      throw new AuthError("auth/invalid-email-format", "Invalid email.");

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, e, password);
    } catch (err: any) {
      const code: string = err?.code ?? "";

      if (code === "auth/too-many-requests")
        throw new AuthError("auth/too-many-requests", "Too many attempts. Please wait or reset your password.");
      if (code === "auth/network-request-failed")
        throw new AuthError("auth/network-request-failed", "Network error. Check your connection.");

      // These two codes are unambiguous (older SDK / emulator / protection OFF)
      if (code === "auth/user-not-found")
        throw new AuthError("auth/user-not-found", "No account found with this email.");
      if (code === "auth/wrong-password")
        throw new AuthError("auth/wrong-password", "Incorrect password.");

      // auth/invalid-credential = Firebase v10 with Email Enumeration Protection ON
      // Both "wrong email" and "wrong password" come here — we cannot tell them apart.
      // Fix: Firebase Console → Authentication → Settings → User actions
      //      → disable "Email enumeration protection"
      // Until then we show a combined message.
      if (code === "auth/invalid-credential")
        throw new AuthError("auth/ambiguous-credentials", "Incorrect email or password.");

      throw new AuthError(code || "auth/unknown", "Sign-in failed. Please try again.");
    }

    // Back-fill email doc (non-blocking)
    writeEmailDoc(e, credential.user.uid);

    // Block unverified users
    if (!credential.user.emailVerified) {
      await signOut(auth);
      throw new AuthError("auth/email-not-verified", "Please verify your email before signing in.");
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, username: string): Promise<void> => {
    const e = email.trim().toLowerCase();
    const u = username.trim().toLowerCase();

    if (!isValidEmailFormat(e))
      throw new AuthError("auth/invalid-email-format", "Invalid email.");

    // Check username uniqueness
    try {
      const snap = await getDoc(doc(db, "usernames", u));
      if (snap.exists()) throw new AuthError("auth/username-taken", "Username already taken.");
    } catch (err: any) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("auth/network-request-failed", "Network error. Check your connection.");
    }

    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, e, password);
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (code === "auth/email-already-in-use")
        throw new AuthError("auth/email-already-in-use", "An account with this email already exists.");
      if (code === "auth/weak-password")
        throw new AuthError("auth/weak-password", "Password is too weak.");
      if (code === "auth/invalid-email")
        throw new AuthError("auth/invalid-email-format", "Invalid email.");
      if (code === "auth/network-request-failed")
        throw new AuthError("auth/network-request-failed", "Network error. Check your connection.");
      throw new AuthError(code || "auth/unknown", "Registration failed. Please try again.");
    }

    const user = credential.user;
    try { await updateProfile(user, { displayName: username.trim() }); } catch { /* ok */ }

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid, email: e, username: u,
        displayName: username.trim(), createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "usernames", u), { uid: user.uid });
      await writeEmailDoc(e, user.uid);
    } catch { /* silent */ }

    try {
      await sendEmailVerification(user, { url: `${SITE_URL}/`, handleCodeInApp: false });
    } catch { /* ok */ }

    await signOut(auth);
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async () => { clearAll(); await signOut(auth); };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  const resetPassword = async (email: string): Promise<void> => {
    const e = email.trim().toLowerCase();

    if (!isValidEmailFormat(e))
      throw new AuthError("auth/invalid-email-format", "Invalid email.");

    // Check Firestore doc — reliable for users registered via this app.
    // If doc doesn't exist it could be an old user (no doc) so we still attempt.
    // When Email Enumeration Protection is OFF, Firebase will throw user-not-found
    // for real non-existent emails, which we catch below.
    try {
      const snap = await getDoc(emailDocRef(e));
      if (!snap.exists()) {
        // No Firestore doc. Could be old user — attempt send anyway.
        // If protection is OFF, Firebase will throw if email not registered.
      }
    } catch { /* network issue — fall through and try */ }

    try {
      await sendPasswordResetEmail(auth, e, { url: `${SITE_URL}/`, handleCodeInApp: false });
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-email")
        throw new AuthError("auth/user-not-found", "No account found with this email.");
      if (code === "auth/too-many-requests")
        throw new AuthError("auth/too-many-requests", "Too many requests. Please wait.");
      if (code === "auth/network-request-failed")
        throw new AuthError("auth/network-request-failed", "Network error. Check your connection.");
      throw new AuthError(code || "auth/unknown", "Could not send reset email. Please try again.");
    }
  };

  return { currentUser, loading, login, register, logout, resetPassword, refreshUser, syncFromCloud, clearAll };
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
