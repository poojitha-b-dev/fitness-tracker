# FitTracker — Fitness Tracking App

A comprehensive fitness tracking application built with React, TypeScript, Firebase, and Tailwind CSS.

## 🚀 Features

- **Authentication** — Email/password login, registration with email verification, forgot password, unique username system
- **Dashboard** — Overview of weekly stats, quick actions, activity feed
- **Workout Tracker** — Log exercises, sets, reps, weights, duration, calories burned
- **Nutrition Tracker** — Track meals (breakfast, lunch, dinner, snacks), calories, macros, water intake
- **Health Metrics** — Record weight, blood pressure, heart rate, sleep, stress, energy levels
- **Goals** — Set and track fitness goals with progress bars, deadlines, and priority levels
- **Progress** — Charts and heatmap built from your real logged data
- **Profile** — Change username, email, password from one place

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Firebase** — Auth + Firestore (cloud database)
- **Tailwind CSS** — Styling
- **Vite** — Build tool
- **Lucide React** — Icons

## 📦 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Firebase is already configured
Credentials are in `src/config/firebase.ts`. The project connects to Firebase automatically.

### 3. Deploy Firestore rules
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 4. Run the app
```bash
npm run client
```

## 📁 Project Structure

```
src/
├── App.tsx                  ← Root, auth gate
├── components/
│   ├── Dashboard.tsx        ← Home overview
│   ├── WorkoutTracker.tsx   ← Log workouts
│   ├── NutritionTracker.tsx ← Track meals
│   ├── HealthMetrics.tsx    ← Health data
│   ├── Goals.tsx            ← Fitness goals
│   ├── Progress.tsx         ← Charts & heatmap
│   ├── Profile.tsx          ← Account settings
│   ├── Navigation.tsx       ← Top nav bar
│   ├── LoginForm.tsx        ← Sign in
│   ├── RegisterForm.tsx     ← Sign up
│   ├── ForgotPasswordForm.tsx
│   └── useAuth.ts           ← Auth context & Firebase ops
├── config/
│   └── firebase.ts          ← Firebase init
├── data/
│   ├── exercises.ts         ← Exercise library
│   └── foods.ts             ← Food database
├── hooks/
│   └── AuthPage.tsx         ← Auth page shell
├── types/
│   └── index.ts             ← TypeScript interfaces
└── utils/
    ├── calculations.ts      ← BMI, TDEE, etc.
    ├── storage.ts           ← localStorage + Firestore sync
    └── validation.ts        ← Email, username, password rules
```

## 💾 Data Storage

All user data (workouts, nutrition, health metrics, goals) is:
- Saved to **localStorage** immediately (fast, works offline)
- Synced to **Firestore** in the background (cloud, cross-device)
- Loaded from **Firestore** on login so data follows the user across devices

## 🔒 Security

- Firestore rules ensure users can only read/write their own data
- Passwords hashed by Firebase Auth
- Username uniqueness enforced via Firestore index collection
- Disposable email domains blocked on registration
