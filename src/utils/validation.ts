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

  if (score <= 2) {
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

// Well-known consumer providers that must match EXACTLY.
// Any domain that contains these brand names but doesn't match exactly
// (e.g. gmail.co, gmail.om, gmailcom, gmal.com) is rejected as invalid format.
const FIXED_DOMAINS: string[] = [
  "gmail.com",
  "hotmail.com",
  "yahoo.com",
  "outlook.com",
];

// Brand-name substrings used to catch typos like "gmailcom", "yahooo.com", etc.
// If the domain contains one of these substrings but is NOT in FIXED_DOMAINS,
// it is treated as a typo/invalid format rather than a custom domain.
const FIXED_BRAND_PATTERNS: RegExp[] = [
  /gmail/,
  /hotmail/,
  /yahoo/,
  /outlook/,
];

export const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();

  // Must have exactly one @
  const atParts = trimmed.split("@");
  if (atParts.length !== 2) return false;

  const [local, domain] = atParts;
  if (!local || !domain) return false;

  // Basic structure check
  const re = /^[a-zA-Z0-9_%+\-]+(\.[a-zA-Z0-9_%+\-]+)*@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/;
  if (!re.test(trimmed)) return false;

  // No consecutive dots anywhere
  if (trimmed.includes("..")) return false;

  // Local part cannot start or end with a dot
  if (local.startsWith(".") || local.endsWith(".")) return false;

  // Domain cannot start or end with a dot or hyphen
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;

  // Must have at least one dot in domain
  if (!domain.includes(".")) return false;

  // TLD must be 2+ alpha chars only
  const tld = domain.split(".").pop() ?? "";
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  // ── Fixed-domain strict check ──────────────────────────────────────────────
  // If the domain looks like a well-known provider (contains the brand name)
  // it MUST match the exact known domain — no typos allowed.
  const looksLikeFixedBrand = FIXED_BRAND_PATTERNS.some(p => p.test(domain));
  if (looksLikeFixedBrand && !FIXED_DOMAINS.includes(domain)) {
    return false; // e.g. gmail.co, gmail.om, gmailcom, gmal.com → invalid
  }

  // Block disposable/throwaway domains
  const disposableDomains = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
    "maildrop.cc", "fakeinbox.com", "getairmail.com", "filzmail.com",
    "discard.email", "spamgourmet.com", "mailnull.com", "spamcorpse.com",
  ];
  if (disposableDomains.includes(domain)) return false;

  return true;
};

// ─── Username Validation ─────────────────────────────────────────────────────

// Allowed: letters (a-z), numbers (0-9), underscore (_), dot (.)
// Rules:
//   - 3–20 chars
//   - MUST start with a letter (a-z or A-Z)
//   - cannot end with _ or .
//   - no consecutive dots (..)
//   - no spaces or other special characters
export const isValidUsername = (username: string): string | null => {
  if (username.length < 3)  return "Username must be at least 3 characters.";
  if (username.length > 20) return "Username must be under 20 characters.";

  if (!/^[a-zA-Z0-9_.]+$/.test(username))
    return "Only letters, numbers, underscores (_), and dots (.) are allowed.";

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(username))
    return "Username must start with a letter.";

  if (username.endsWith("_") || username.endsWith("."))
    return "Username cannot end with an underscore or dot.";

  if (username.includes(".."))
    return "Username cannot contain consecutive dots.";

  return null; // valid
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
