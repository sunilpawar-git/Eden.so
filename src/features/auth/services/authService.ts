/**
 * Auth Service - Firebase Authentication operations
 * Handles Google Sign-In and auth state
 */
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuthStore } from '../stores/authStore';
import { createUserFromAuth } from '../types/user';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<void> {
    const { setLoading, setUser, setError } = useAuthStore.getState();

    setLoading(true);

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        const user = createUserFromAuth(
            firebaseUser.uid,
            firebaseUser.displayName,
            firebaseUser.email,
            firebaseUser.photoURL
        );

        setUser(user);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign in failed';
        setError(message);
        throw error;
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
    const { clearUser, setError } = useAuthStore.getState();

    try {
        await firebaseSignOut(auth);
        clearUser();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign out failed';
        setError(message);
        throw error;
    }
}

/**
 * Subscribe to auth state changes
 * Call this once on app initialization
 */
export function subscribeToAuthState(): () => void {
    const { setUser, clearUser, setLoading } = useAuthStore.getState();

    setLoading(true);

    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            const user = createUserFromAuth(
                firebaseUser.uid,
                firebaseUser.displayName,
                firebaseUser.email,
                firebaseUser.photoURL
            );
            setUser(user);
        } else {
            clearUser();
        }
        setLoading(false);
    });
}
