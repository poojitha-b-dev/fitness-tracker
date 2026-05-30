// src/config/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB464UldkUwxEDPgXPfr8OJM7qYOhgpKkw",
  authDomain: "fitness-tracker-app-74b0d.firebaseapp.com",
  projectId: "fitness-tracker-app-74b0d",
  storageBucket: "fitness-tracker-app-74b0d.firebasestorage.app",
  messagingSenderId: "763557485639",
  appId: "1:763557485639:web:0cc12ee19a8aff67102562",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;