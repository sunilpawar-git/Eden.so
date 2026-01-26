import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { signOut } from '@/features/auth/services/authService';

// Mock stores and services
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn(),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: {
        info: vi.fn(),
    },
}));

vi.mock('@/features/auth/services/authService', () => ({
    signOut: vi.fn(),
}));

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuthStore).mockReturnValue({
            user: { name: 'Test User', avatarUrl: '' },
            isLoading: false,
            isAuthenticated: true,
            error: null,
            setUser: vi.fn(),
            clearUser: vi.fn(),
            setLoading: vi.fn(),
            setError: vi.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    });

    it('should trigger a placeholder toast when "+ New Workspace" is clicked', () => {
        render(<Sidebar />);

        const newWorkspaceBtn = screen.getByText(strings.workspace.newWorkspace);
        fireEvent.click(newWorkspaceBtn);

        expect(toast.info).toHaveBeenCalledWith(
            expect.stringContaining(strings.common.comingSoon)
        );
    });

    it('should render user information from auth store', () => {
        render(<Sidebar />);
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should call signOut when "Sign out" is clicked', async () => {
        render(<Sidebar />);

        const signOutButton = screen.getByText(strings.auth.signOut);
        fireEvent.click(signOutButton);

        expect(signOut).toHaveBeenCalledTimes(1);
    });
});
