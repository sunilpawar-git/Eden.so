/**
 * Auth Store - ViewModel for authentication state
 * Uses Zustand with .update() pattern for thread-safe updates
 */
import { create } from 'zustand';
import type { User } from '../types/user';

const GCAL_TOKEN_KEY = 'gcal_access_token';

function persistToken(token: string | null): void {
    try {
        if (token) {
            sessionStorage.setItem(GCAL_TOKEN_KEY, token);
        } else {
            sessionStorage.removeItem(GCAL_TOKEN_KEY);
        }
    } catch {
        /* sessionStorage may be unavailable in some environments */
    }
}

function restoreToken(): string | null {
    try {
        return sessionStorage.getItem(GCAL_TOKEN_KEY);
    } catch {
        return null;
    }
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    googleAccessToken: string | null;
}

interface AuthActions {
    setUser: (user: User) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string) => void;
    setGoogleAccessToken: (token: string | null) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    googleAccessToken: restoreToken(),
};

export const useAuthStore = create<AuthStore>()((set) => ({
    ...initialState,

    setUser: (user: User) => {
        set({
            user,
            isAuthenticated: true,
            error: null,
            isLoading: false,
        });
    },

    clearUser: () => {
        persistToken(null);
        set({
            user: null,
            isAuthenticated: false,
            googleAccessToken: null,
        });
    },

    setLoading: (isLoading: boolean) => {
        set({ isLoading });
    },

    setError: (error: string) => {
        set({
            error,
            isLoading: false,
        });
    },

    setGoogleAccessToken: (token: string | null) => {
        persistToken(token);
        set({ googleAccessToken: token });
    },
}));
