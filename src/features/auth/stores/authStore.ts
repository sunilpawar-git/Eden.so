/**
 * Auth Store - ViewModel for authentication state
 * Uses Zustand with .update() pattern for thread-safe updates
 */
import { create } from 'zustand';
import type { User } from '../types/user';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    /** Client-side OAuth: whether user has an active Google Calendar token */
    isCalendarConnected: boolean;
}

interface AuthActions {
    setUser: (user: User) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string) => void;
    setCalendarConnected: (connected: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    isCalendarConnected: false,
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
        set({
            user: null,
            isAuthenticated: false,
            isCalendarConnected: false,
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

    setCalendarConnected: (isCalendarConnected: boolean) => {
        set({ isCalendarConnected });
    },
}));
