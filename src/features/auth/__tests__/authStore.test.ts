/**
 * Auth Store Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/user';

const mockUser: User = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
};

describe('AuthStore', () => {
    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
            isCalendarConnected: false,
        });
    });

    describe('initial state', () => {
        it('should start with no user', () => {
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('should start with loading false', () => {
            const state = useAuthStore.getState();
            expect(state.isLoading).toBe(false);
        });

        it('should start with no error', () => {
            const state = useAuthStore.getState();
            expect(state.error).toBeNull();
        });

        it('should start with calendar disconnected', () => {
            const state = useAuthStore.getState();
            expect(state.isCalendarConnected).toBe(false);
        });
    });

    describe('setUser', () => {
        it('should set user and mark as authenticated', () => {
            useAuthStore.getState().setUser(mockUser);

            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.isAuthenticated).toBe(true);
        });

        it('should clear error when setting user', () => {
            useAuthStore.setState({ error: 'Previous error' });
            useAuthStore.getState().setUser(mockUser);

            expect(useAuthStore.getState().error).toBeNull();
        });
    });

    describe('clearUser', () => {
        it('should clear user and mark as not authenticated', () => {
            useAuthStore.setState({ user: mockUser, isAuthenticated: true });
            useAuthStore.getState().clearUser();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('should reset isCalendarConnected on sign out', () => {
            useAuthStore.setState({ isCalendarConnected: true });
            useAuthStore.getState().clearUser();

            expect(useAuthStore.getState().isCalendarConnected).toBe(false);
        });
    });

    describe('setLoading', () => {
        it('should update loading state', () => {
            useAuthStore.getState().setLoading(true);
            expect(useAuthStore.getState().isLoading).toBe(true);

            useAuthStore.getState().setLoading(false);
            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });

    describe('setError', () => {
        it('should set error message', () => {
            const errorMessage = 'Authentication failed';
            useAuthStore.getState().setError(errorMessage);

            expect(useAuthStore.getState().error).toBe(errorMessage);
        });

        it('should stop loading when error occurs', () => {
            useAuthStore.setState({ isLoading: true });
            useAuthStore.getState().setError('Error');

            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });

    describe('setCalendarConnected', () => {
        it('should set isCalendarConnected to true', () => {
            useAuthStore.getState().setCalendarConnected(true);
            expect(useAuthStore.getState().isCalendarConnected).toBe(true);
        });

        it('should set isCalendarConnected to false', () => {
            useAuthStore.setState({ isCalendarConnected: true });
            useAuthStore.getState().setCalendarConnected(false);
            expect(useAuthStore.getState().isCalendarConnected).toBe(false);
        });
    });
});
