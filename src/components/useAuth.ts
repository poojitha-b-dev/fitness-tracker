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
  fetchSignInMethodsForEmail,
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
      // Fail silently
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
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("fitness-app-")) localStorage.removeItem(key);
    });
  };

  // ── login: separate "no account" vs "wrong password", block unverified ──────
  const login = async (email: string, password: string) => {
    // Step 1: check if the email even exists
    let methods: string[] = [];
    try {
      methods = await fetchSignInMethodsForEmail(auth, email);
    } catch {
      // If this fails, proceed — Firebase will throw the real error below
    }

    if (methods.length === 0) {
      const err = new Error("No account found with this email address.");
      (err as any).code = "auth/user-not-found";
      throw err;
    }

    // Step 2: try signing in — this will throw if password is wrong
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Step 3: block unverified users
    if (!user.emailVerified) {
      await signOut(auth);
      const err = new Error("Please verify your email before signing in.");
      (err as any).code = "auth/email-not-verified";
      throw err;
    }
  };

  // ── register: send verification email with continueUrl ────────────────────
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

    await setDoc(doc(db, "usernames", username.toLowerCase()), {
      uid: user.uid,
    });

    // continueUrl = where Firebase sends the user AFTER they click the verify link
    await sendEmailVerification(user, {
      url: `${SITE_URL}/`,
      handleCodeInApp: false,
    });

    // Sign out immediately — must verify email before entering the app
    await signOut(auth);
  };

  const logout = async () => {
    clearAll();
    await signOut(auth);
  };

  // ── resetPassword: continueUrl so user can navigate back after reset ───────
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
