/**
 * Auth Token Service - Provides the Firebase ID token for authenticated API calls
 */
import { auth } from '@/config/firebase';

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
