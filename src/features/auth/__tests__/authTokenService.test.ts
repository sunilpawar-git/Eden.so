import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetIdToken, mockAuth } = vi.hoisted(() => ({
    mockGetIdToken: vi.fn(),
    mockAuth: { currentUser: null as { getIdToken: () => Promise<string> } | null },
}));

vi.mock('@/config/firebase', () => ({
    auth: mockAuth,
}));

// eslint-disable-next-line import-x/first
import { getAuthToken } from '../services/authTokenService';

describe('authTokenService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.currentUser = null;
    });

    it('returns null when no user is signed in', async () => {
        mockAuth.currentUser = null;

        const token = await getAuthToken();

        expect(token).toBeNull();
    });

    it('returns id token when user is signed in', async () => {
        mockGetIdToken.mockResolvedValue('jwt-token-123');
        mockAuth.currentUser = { getIdToken: mockGetIdToken };

        const token = await getAuthToken();

        expect(token).toBe('jwt-token-123');
        expect(mockGetIdToken).toHaveBeenCalled();
    });

    it('returns null when getIdToken throws', async () => {
        mockGetIdToken.mockRejectedValue(new Error('Token expired'));
        mockAuth.currentUser = { getIdToken: mockGetIdToken };

        const token = await getAuthToken();

        expect(token).toBeNull();
    });

    it('returns null when getIdToken rejects with non-Error', async () => {
        mockGetIdToken.mockRejectedValue('network error');
        mockAuth.currentUser = { getIdToken: mockGetIdToken };

        const token = await getAuthToken();

        expect(token).toBeNull();
    });
});
