/**
 * Firebase Configuration
 * SECURITY: API keys here are client-safe (restricted by domain in Firebase Console)
 * Sensitive operations go through Cloud Functions
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// These values should come from environment variables in production
const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
};

// Validate config in development
if (import.meta.env.DEV && !firebaseConfig.apiKey) {
    console.warn(
        'Firebase config not found. Create .env.local with VITE_FIREBASE_* variables.'
    );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
