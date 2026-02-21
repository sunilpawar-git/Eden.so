/**
 * Calendar Auth Service Tests - checkCalendarConnection
 * Ensures isCalendarConnected state is restored from localStorage on auth state change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/firebase', () => ({
    auth: { currentUser: { uid: 'test-uid' } },
}));

vi.mock('@/features/calendar/localization/calendarStrings', () => ({
    calendarStrings: { errors: { noToken: 'No token' } },
}));

const mockSetCalendarConnected = vi.fn();
vi.mock('../stores/authStore', () => ({
    useAuthStore: {
        getState: () => ({ setCalendarConnected: mockSetCalendarConnected }),
    },
}));

// eslint-disable-next-line import-x/first
import { auth } from '@/config/firebase';
// eslint-disable-next-line import-x/first
import { checkCalendarConnection, STORAGE_KEY, EXPIRY_KEY } from '../services/calendarAuthService';

describe('checkCalendarConnection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('sets isCalendarConnected to true when valid token is in localStorage', async () => {
        localStorage.setItem(STORAGE_KEY, 'valid-token');
        localStorage.setItem(EXPIRY_KEY, (Date.now() + 100000).toString());

        checkCalendarConnection();

        expect(mockSetCalendarConnected).toHaveBeenCalledWith(true);
    });

    it('sets isCalendarConnected to false when storage is empty', () => {
        checkCalendarConnection();

        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('clears storage and sets isCalendarConnected to false when token is expired', () => {
        localStorage.setItem(STORAGE_KEY, 'expired-token');
        localStorage.setItem(EXPIRY_KEY, (Date.now() - 100000).toString());

        checkCalendarConnection();

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('does nothing when no auth currentUser is available', () => {
        const originalUser = auth.currentUser;
        // @ts-expect-error Mocking readonly property
        auth.currentUser = null;

        checkCalendarConnection();

        expect(mockSetCalendarConnected).not.toHaveBeenCalled();

        // Restore
        // @ts-expect-error Mocking readonly property
        auth.currentUser = originalUser;
    });

    it('rejects token with invalid characters (XSS injection attempt)', () => {
        localStorage.setItem(STORAGE_KEY, 'valid<script>alert(1)</script>');
        localStorage.setItem(EXPIRY_KEY, (Date.now() + 100000).toString());

        checkCalendarConnection();

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('rejects token with newline characters (header injection attempt)', () => {
        localStorage.setItem(STORAGE_KEY, 'token\nX-Malicious: header');
        localStorage.setItem(EXPIRY_KEY, (Date.now() + 100000).toString());

        checkCalendarConnection();

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('accepts valid OAuth token format with dots, dashes, and underscores', () => {
        localStorage.setItem(STORAGE_KEY, 'mock-token-a0AfB_byC-1234_567890-abc.def');
        localStorage.setItem(EXPIRY_KEY, (Date.now() + 100000).toString());

        checkCalendarConnection();

        expect(mockSetCalendarConnected).toHaveBeenCalledWith(true);
    });
});
