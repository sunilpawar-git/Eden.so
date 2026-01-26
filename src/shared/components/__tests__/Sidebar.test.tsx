import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

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
            user: { name: 'Test User', email: 'test@example.com' },
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
});
