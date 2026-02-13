/**
 * useAuthToken - Provides current Firebase ID token for authenticated requests
 * Caches token and refreshes periodically to avoid expired tokens
 */
import { useState, useEffect } from 'react';
import { getAuthToken } from '@/features/auth/services/authTokenService';

/** Refresh interval: tokens expire after 1 hour, refresh at 50 min */
const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

/**
 * Hook that provides the current Firebase auth token.
 * Used by components that need to pass tokens via query params
 * (e.g. <img> tags that can't send Authorization headers).
 */
export function useAuthToken(): string | null {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const refreshToken = async (): Promise<void> => {
            const t = await getAuthToken();
            if (mounted) setToken(t);
        };

        void refreshToken();
        const interval = setInterval(() => { void refreshToken(); }, TOKEN_REFRESH_INTERVAL_MS);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return token;
}
