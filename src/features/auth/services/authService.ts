/**
 * Auth Service - Firebase Authentication operations
 * Handles Google Sign-In and auth state
 */
import {
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
import { checkCalendarConnection } from './calendarAuthService';
import { setSentryUser, clearSentryUser } from '@/shared/services/sentryService';
import { identifyUser, resetAnalyticsUser, trackSignIn, trackSignOut } from '@/shared/services/analyticsService';

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
        setSentryUser(user.id);
        identifyUser(user.id);
        trackSignIn();
    } catch (error) {
        // User closed the popup — not a real error, just reset loading state silently
        if (error instanceof Error && error.message.includes('popup-closed-by-user')) {
            useAuthStore.getState().setLoading(false);
            return;
        }
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
    const { clearUser, setError } = useAuthStore.getState();

    try {
        await firebaseSignOut(auth);
    } catch (error) {
        const message = error instanceof Error ? error.message : strings.auth.signOutFailed;
        setError(message);
        throw error;
    } finally {
        trackSignOut();
        clearUser();
        clearSentryUser();
        resetAnalyticsUser();
        useSubscriptionStore.getState().reset();
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
            setSentryUser(user.id);
            identifyUser(user.id);
            checkCalendarConnection();
        } else {
            clearUser();
            clearSentryUser();
            resetAnalyticsUser();
        }
        setLoading(false);
    });
}

