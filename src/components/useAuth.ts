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

const SITE_URL = "https://myfittrackr.vercel.app";

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

export const useAuthState = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async (user: User): Promise<AuthUser> => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        (user as AuthUser).username = userDoc.data().username;
      }
    } catch {
      // Fail silently — auth still works without Firestore data
    }
    return user as AuthUser;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const hydrated = await hydrateUser(user);
        setCurrentUser(hydrated);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    // Reload from Firebase to get latest emailVerified status
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
    // Clear localStorage on logout
    const keysToKeep: string[] = [];
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith("fitness-app-")) keysToKeep.push(key);
    });
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("fitness-app-")) localStorage.removeItem(key);
    });
  };

  // ── login: block unverified users ──────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    if (!user.emailVerified) {
      // Sign them back out immediately — don't let them in
      await signOut(auth);
      const err = new Error("Please verify your email before signing in. Check your inbox for the verification link.");
      (err as any).code = "auth/email-not-verified";
      throw err;
    }
  };

  // ── register: send verification with continueUrl ───────────────────────────
  const register = async (email: string, password: string, username: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await updateProfile(user, { displayName: username });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username.toLowerCase(),
      displayName: username,
      emailVerified: false,
      createdAt: serverTimestamp(),
    });

    // Username → uid index for uniqueness checks
    await setDoc(doc(db, "usernames", username.toLowerCase()), {
      uid: user.uid,
    });

    // Send verification email — after clicking it, user lands on the login page
    await sendEmailVerification(user, {
      url: `${SITE_URL}/`,
      handleCodeInApp: false,
    });

    // Sign them out immediately — they must verify first
    await signOut(auth);
  };

  const logout = async () => {
    clearAll();
    await signOut(auth);
  };

  // ── resetPassword: include continueUrl so user can navigate back ───────────
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${SITE_URL}/`,
      handleCodeInApp: false,
    });
  };

  return { currentUser, loading, login, register, logout, resetPassword, refreshUser, syncFromCloud, clearAll };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
