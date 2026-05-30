// src/components/useAuth.ts
import { storage } from '../utils/storage';
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
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

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
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthState = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch and attach Firestore username to the Firebase user object
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
        await storage.syncFromCloud();   // ← add this
      } else {
        setCurrentUser(null);
        storage.clearAll();              // ← add this
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Call this after profile updates so the UI reflects new data immediately
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    const hydrated = await hydrateUser(auth.currentUser);
    setCurrentUser({ ...hydrated } as AuthUser); // new reference triggers re-render
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

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

    await sendEmailVerification(user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return { currentUser, loading, login, register, logout, resetPassword, refreshUser };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
