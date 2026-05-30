// src/utils/validation.ts
import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

// ─── Password Strength ──────────────────────────────────────────────────────

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

export interface PasswordAnalysis {
  strength: PasswordStrength;
  score: number; // 0–4
  label: string;
  color: string;
  barColor: string;
  tips: string[];
}

export const analyzePassword = (password: string): PasswordAnalysis => {
  if (!password) {
    return { strength: "empty", score: 0, label: "", color: "transparent", barColor: "bg-transparent", tips: [] };
  }

  const tips: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else tips.push("At least 8 characters");

  if (/[A-Z]/.test(password)) score++;
  else tips.push("At least one uppercase letter");

  if (/[0-9]/.test(password)) score++;
  else tips.push("At least one number");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else tips.push("At least one special character (!@#$...)");

  if (score <= 1) {
    return { strength: "weak", score, label: "Weak", color: "#ef4444", barColor: "bg-red-500", tips };
  } else if (score === 2) {
    return { strength: "weak", score, label: "Weak", color: "#ef4444", barColor: "bg-red-500", tips };
  } else if (score === 3) {
    return { strength: "medium", score, label: "Medium", color: "#f59e0b", barColor: "bg-amber-400", tips };
  } else {
    return { strength: "strong", score, label: "Strong", color: "#10b981", barColor: "bg-emerald-500", tips };
  }
};

// Only medium+ passwords allowed
export const isPasswordAcceptable = (password: string): boolean => {
  const { strength } = analyzePassword(password);
  return strength === "medium" || strength === "strong";
};

// ─── Email Validation ────────────────────────────────────────────────────────

// Basic RFC-compliant email check — rejects obviously fake patterns
export const isValidEmail = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;

  // Block disposable/throwaway domains
  const disposableDomains = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
    "maildrop.cc", "fakeinbox.com", "getairmail.com", "filzmail.com",
    "discard.email", "spamgourmet.com", "mailnull.com", "spamcorpse.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) return false;

  return true;
};

// ─── Username Validation ─────────────────────────────────────────────────────

export const isValidUsername = (username: string): string | null => {
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be under 20 characters";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Only letters, numbers, and underscores allowed";
  if (/^[_]/.test(username)) return "Username cannot start with an underscore";
  return null;
};

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const ref = doc(db, "usernames", username.toLowerCase());
    const snap = await getDoc(ref);
    return !snap.exists();
  } catch {
    return true; // Fail open — Firebase will enforce on write
  }
};
