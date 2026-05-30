# 🔥 Firebase Auth — Integration Guide

## Files Overview

```
src/
├── config/
│   └── firebase.ts              ← Firebase app init (put your credentials here)
├── hooks/
│   └── useAuth.ts               ← Auth context + all Firebase operations
├── utils/
│   └── validation.ts            ← Password strength, email & username validation
├── components/auth/
│   ├── AuthPage.tsx             ← Main shell: background, branding, card animation
│   ├── LoginForm.tsx            ← Sign-in form
│   ├── RegisterForm.tsx         ← Sign-up form (username check, strength meter, email verify)
│   └── ForgotPasswordForm.tsx  ← Password reset
└── App.tsx                      ← Root: AuthProvider + AuthGate (replaces your existing App.tsx)

firestore.rules                  ← Deploy these to Firebase for security
```

---

## Step 1 — Install Firebase

```bash
npm install firebase
```

---

## Step 2 — Add your Firebase config

Open `src/config/firebase.ts` and replace the placeholder values with your
credentials from **Firebase Console → Project Settings → Your Apps → SDK setup**.

```ts
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

---

## Step 3 — Enable Firebase services

In the **Firebase Console**:

1. **Authentication → Sign-in method** → Enable **Email/Password**
2. **Authentication → Settings → Email verification** — leave default templates
   or customise them
3. **Firestore Database** → Create database (start in **production mode**)

---

## Step 4 — Deploy Firestore security rules

Either paste `firestore.rules` content into **Firebase Console → Firestore → Rules**,
or via CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore       # select your project, point to firestore.rules
firebase deploy --only firestore:rules
```

---

## Step 5 — Replace your App.tsx

The provided `src/App.tsx` wraps everything in `<AuthProvider>` and shows the
auth page until the user signs in. Once authenticated it renders your fitness
app. Replace your existing `App.tsx` with the provided one and then drop your
existing app UI into the `FitnessApp` component inside it.

---

## Features included

| Feature | Details |
|---|---|
| **Email verification** | Sent automatically on register; user sees success screen |
| **Unique usernames** | Checked against Firestore `usernames` collection with debounce |
| **Unique emails** | Enforced by Firebase Auth (returns `auth/email-already-in-use`) |
| **Password strength** | 4-bar meter: Weak / Medium / Strong. Only Medium+ allowed |
| **Disposable email blocking** | 20+ known throwaway domains blocked client-side |
| **Forgot password** | Firebase sends reset link; email enumeration protected |
| **Secure rules** | Firestore rules prevent any user from reading/writing others' data |

---

## Using auth state anywhere in your app

```tsx
import { useAuth } from "./hooks/useAuth";

const MyComponent = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div>
      <p>Hello {currentUser?.displayName}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
};
```

---

## Accessing username

The username is stored in Firestore and attached to the user object on load:

```tsx
const { currentUser } = useAuth();
console.log((currentUser as any).username); // "john_doe"
// or via displayName (set on Firebase Auth profile):
console.log(currentUser?.displayName);      // "john_doe"
```
