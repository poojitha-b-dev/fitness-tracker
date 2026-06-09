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

// The four fixed consumer providers — domain must match one of these EXACTLY.
const _FIXED_DOMAINS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];

// Regex patterns that match if ANY of the brand names appear anywhere in the domain
// (catches gmail.cm, gmailcom, outlookcom, yahooo.com, etc.)
const _BRAND_PATTERNS = [/gmail/, /hotmail/, /yahoo/, /outlook/];

// Brand name strings used for edit-distance check on the first domain label
// (catches gmil.com, gmal.com, hotmial.com, yaho.com, etc.)
const _BRAND_NAMES = ["gmail", "hotmail", "yahoo", "outlook"];

// Legitimate domains whose first label happens to be close to a brand name
const _DOMAIN_WHITELIST = ["mail.com", "mail.ru", "ymail.com", "live.com", "msn.com"];

// Levenshtein distance between two strings
const _lev = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
};

const _isTypoOfFixedDomain = (domain: string): boolean => {
  if (_FIXED_DOMAINS.includes(domain)) return false;   // exact match → valid, not a typo
  if (_DOMAIN_WHITELIST.includes(domain)) return false; // whitelisted legit domain

  // Check 1: brand name appears anywhere in the domain string (gmail.cm, gmailcom…)
  if (_BRAND_PATTERNS.some(p => p.test(domain))) return true;

  // Check 2: first label (before first dot) is within edit-distance 2 of a brand name
  // (gmil.com, gmal.com, hotmial.com, yaho.com…)
  const firstLabel = domain.split(".")[0];
  if (_BRAND_NAMES.some(b => _lev(firstLabel, b) <= 2)) return true;

  return false;
};

export const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();

  // Must have exactly one @
  const atParts = trimmed.split("@");
  if (atParts.length !== 2) return false;
  const [local, domain] = atParts;
  if (!local || !domain) return false;

  // Basic structural check
  const re = /^[a-zA-Z0-9_%+\-]+(\.[a-zA-Z0-9_%+\-]+)*@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,}$/;
  if (!re.test(trimmed)) return false;

  // No consecutive dots
  if (trimmed.includes("..")) return false;

  // Local part rules
  if (local.startsWith(".") || local.endsWith(".")) return false;

  // Domain rules
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.startsWith("-") || domain.endsWith("-")) return false;
  if (!domain.includes(".")) return false;

  // TLD must be 2+ alpha chars
  const tld = domain.split(".").pop() ?? "";
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  // Typo-of-fixed-domain check — must come BEFORE the DB check
  if (_isTypoOfFixedDomain(domain)) return false;

  // Block disposable/throwaway domains
  const disposable = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
    "maildrop.cc", "fakeinbox.com", "getairmail.com", "filzmail.com",
    "discard.email", "spamgourmet.com", "mailnull.com", "spamcorpse.com",
  ];
  if (disposable.includes(domain)) return false;

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
