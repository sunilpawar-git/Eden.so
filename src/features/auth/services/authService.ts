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
import { auth, googleProvider } from '@/config/firebase';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { createUserFromAuth } from '../types/user';
import { strings } from '@/shared/localization/strings';

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<void> {
    const { setLoading, setUser, setError, setGoogleAccessToken } = useAuthStore.getState();

    setLoading(true);

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken);
        }

        const user = createUserFromAuth(
            firebaseUser.uid,
            firebaseUser.displayName,
            firebaseUser.email,
            firebaseUser.photoURL
        );

        setUser(user);
    } catch (error) {
        const message = error instanceof Error ? error.message : strings.auth.signInFailed;
        setError(message);
        throw error;
    }
}

/**
 * Sign out current user.
 * Always clears local state even if Firebase sign-out fails,
 * preventing an inconsistent "authenticated but no token" state.
 */
export async function signOut(): Promise<void> {
    const { clearUser, setError, setGoogleAccessToken } = useAuthStore.getState();

    try {
        await firebaseSignOut(auth);
    } catch (error) {
        const message = error instanceof Error ? error.message : strings.auth.signOutFailed;
        setError(message);
        throw error;
    } finally {
        setGoogleAccessToken(null);
        clearUser();
        useSubscriptionStore.getState().reset();
    }
}

/**
 * Re-acquire Google OAuth access token for Calendar API.
 * Attempts silent re-auth first (no user interaction if Google session is active).
 * Falls back to interactive popup only if silent auth fails.
 * Returns true if token was successfully acquired.
 */
export async function reauthenticateForCalendar(): Promise<boolean> {
    const { setGoogleAccessToken } = useAuthStore.getState();

    if (!auth.currentUser) return false;

    // Try silent re-auth first — popup opens and closes immediately if Google session is live
    const silentProvider = new GoogleAuthProvider();
    silentProvider.addScope('https://www.googleapis.com/auth/calendar.events');
    silentProvider.setCustomParameters({ prompt: 'none' });

    try {
        const silentResult = await signInWithPopup(auth, silentProvider);
        const silentCredential = GoogleAuthProvider.credentialFromResult(silentResult);
        if (silentCredential?.accessToken) {
            setGoogleAccessToken(silentCredential.accessToken);
            return true;
        }
    } catch {
        // Silent failed (session expired or consent revoked) — fall through to interactive
    }

    // Interactive popup fallback
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken);
            return true;
        }
        return false;
    } catch {
        return false;
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
