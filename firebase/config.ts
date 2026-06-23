import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
let app: FirebaseApp | undefined;
export const getFirebaseApp = () => { if (!firebaseConfigured) return undefined; return app ?? (app = getApps().length ? getApp() : initializeApp(config)); };
export const getFirebaseAuth = (): Auth | undefined => { const instance = getFirebaseApp(); return instance ? getAuth(instance) : undefined; };
export const getDb = (): Firestore | undefined => { const instance = getFirebaseApp(); return instance ? getFirestore(instance) : undefined; };
