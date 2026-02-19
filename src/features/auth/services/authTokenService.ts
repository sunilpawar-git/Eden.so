/**
 * Auth Token Service - Provides tokens for authenticated API calls
 * Firebase ID token for backend, Google OAuth token for Calendar API
 */
import { auth } from '@/config/firebase';
import { useAuthStore } from '../stores/authStore';

/**
 * Get the Firebase ID token for the currently authenticated user.
 * Returns null if no user is signed in or token retrieval fails.
 */
export async function getAuthToken(): Promise<string | null> {
    try {
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    } catch {
        return null;
    }
}

/**
 * Get the Google OAuth access token from Zustand store.
 * Returns null if user hasn't authenticated with Calendar scope.
 * Synchronous — token is in memory (backed by sessionStorage for refresh survival).
 */
export function getGoogleAccessToken(): string | null {
    return useAuthStore.getState().googleAccessToken;
}
