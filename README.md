# FitTracker

A full-stack fitness tracking web application built with React, TypeScript, and Firebase. Track your workouts, nutrition, health metrics, and goals — all synced to the cloud.

🌐 **Live App:** [fitness-tracker-two-psi.vercel.app](https://fitness-tracker-two-psi.vercel.app)

---

## Features

- **Authentication** — Register, login, email verification, and password reset via Firebase Auth
- **Dashboard** — Daily overview of calories, water intake, workouts, and active goals
- **Workout Tracker** — Log exercises with sets, reps, and weight; supports custom exercises
- **Nutrition Tracker** — Track daily food intake, calories, protein, carbs, and water
- **Health Metrics** — Record weight, BMI, blood pressure, heart rate, and sleep
- **Goals** — Create and track personal fitness goals with priorities and deadlines
- **Progress** — Visualize trends over time with charts
- **Profile** — Update username, change password, and manage account security

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + custom CSS |
| Auth | Firebase Authentication |
| Database | Firestore (asia-south1) + localStorage cache |
| Deployment | Vercel |

---

## Project Structure

```
fitness-tracker-main/
├── index.html
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── src/
│   ├── App.tsx                  # Root component, auth gate
│   ├── index.css                # Global styles and theme
│   ├── main.tsx                 # Entry point
│   ├── assets/
│   │   └── logo.svg             # FitTracker logo
│   ├── components/
│   │   ├── Dashboard.tsx        # Home dashboard
│   │   ├── WorkoutTracker.tsx   # Workout logging
│   │   ├── NutritionTracker.tsx # Food and water tracking
│   │   ├── HealthMetrics.tsx    # Health data entry
│   │   ├── Goals.tsx            # Goal management
│   │   ├── Progress.tsx         # Progress charts
│   │   ├── Profile.tsx          # Account settings
│   │   ├── Navigation.tsx       # Top nav bar
│   │   ├── LoginForm.tsx        # Login UI
│   │   ├── RegisterForm.tsx     # Registration UI
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── NumericInput.tsx     # Reusable number input
│   │   └── useAuth.ts           # Auth hook
│   ├── hooks/
│   │   └── AuthPage.tsx         # Auth page shell + AuthProvider
│   ├── config/
│   │   └── firebase.ts          # Firebase initialisation
│   ├── data/
│   │   ├── exercises.ts         # Exercise library
│   │   └── foods.ts             # Food database
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   └── utils/
│       ├── storage.ts           # localStorage + Firestore sync
│       ├── validation.ts        # Form validation helpers
│       └── calculations.ts      # BMI, calorie calculations
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication and Firestore enabled

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/fitness-tracker.git
cd fitness-tracker-main

# Install dependencies
npm install
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable **Email/Password** authentication
3. Create a **Firestore** database
4. Copy your config into `src/config/firebase.ts`:

```ts
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

5. Deploy Firestore rules and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Building for Production

```bash
npm run build
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect the repo to [Vercel](https://vercel.com)
3. Vercel auto-deploys on every push to `main`

---

## Data Architecture

All user data is stored in Firestore under per-user sub-collections and cached in localStorage for fast loads:

```
Firestore
└── users/{uid}/
    ├── workouts/      # Workout sessions
    ├── nutrition/     # Daily food logs
    ├── healthMetrics/ # Weight, BP, sleep etc.
    └── goals/         # User goals
```

On login, data syncs from Firestore → localStorage. On every save, data writes to both.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## License

MIT