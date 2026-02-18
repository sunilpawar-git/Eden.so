import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useSidebarViewModel } from '../useSidebarViewModel';
import { strings } from '@/shared/localization/strings';

// Mock the ViewModel
vi.mock('../useSidebarViewModel', () => ({
    useSidebarViewModel: vi.fn(),
}));

describe('Sidebar', () => {
    const mockTogglePin = vi.fn();
    const mockOnMouseEnter = vi.fn();
    const mockOnMouseLeave = vi.fn();
    const mockHandleSignOut = vi.fn();
    const mockHandleNewWorkspace = vi.fn();
    const mockHandleSelectWorkspace = vi.fn();
    const mockHandleRenameWorkspace = vi.fn();

    const defaultViewModel = {
        isPinned: true,
        isExpanded: true,
        togglePin: mockTogglePin,
        onMouseEnter: mockOnMouseEnter,
        onMouseLeave: mockOnMouseLeave,
        user: { id: 'u1', name: 'Test User', avatarUrl: '' },
        workspaces: [{ id: 'ws1', name: 'WS 1' }, { id: 'ws2', name: 'WS 2' }],
        currentWorkspaceId: 'ws1',
        isCreating: false,
        handleSignOut: mockHandleSignOut,
        handleNewWorkspace: mockHandleNewWorkspace,
        handleSelectWorkspace: mockHandleSelectWorkspace,
        handleRenameWorkspace: mockHandleRenameWorkspace,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useSidebarViewModel as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultViewModel);
    });

    it('should render workspaces', () => {
        render(<Sidebar />);
        expect(screen.getByText('WS 1')).toBeInTheDocument();
        expect(screen.getByText('WS 2')).toBeInTheDocument();
    });

    it('should toggle pin state', () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByLabelText('Unpin Sidebar'));
        expect(mockTogglePin).toHaveBeenCalled();
    });

    it('should render unpinned state correctly', () => {
        (useSidebarViewModel as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...defaultViewModel,
            isPinned: false,
        });
        render(<Sidebar />);
        expect(screen.getByLabelText('Pin Sidebar')).toBeInTheDocument();
    });

    it('should handle mouse enter/leave', () => {
        render(<Sidebar />);
        const sidebar = screen.getByRole('complementary');
        fireEvent.mouseEnter(sidebar);
        expect(mockOnMouseEnter).toHaveBeenCalled();
        fireEvent.mouseLeave(sidebar);
        expect(mockOnMouseLeave).toHaveBeenCalled();
    });

    it('should call handleNewWorkspace on button click', () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByText(strings.workspace.newWorkspace));
        expect(mockHandleNewWorkspace).toHaveBeenCalled();
    });

    it('should call handleSelectWorkspace on workspace click', () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByText('WS 2'));
        expect(mockHandleSelectWorkspace).toHaveBeenCalledWith('ws2');
    });

    it('should render user info and handle sign out', () => {
        render(<Sidebar />);
        expect(screen.getByText('Test User')).toBeInTheDocument();
        fireEvent.click(screen.getByText(strings.auth.signOut));
        expect(mockHandleSignOut).toHaveBeenCalled();
    });

    it('should call onSettingsClick', () => {
        const onSettingsClick = vi.fn();
        render(<Sidebar onSettingsClick={onSettingsClick} />);
        fireEvent.click(screen.getByLabelText(strings.settings.title));
        expect(onSettingsClick).toHaveBeenCalled();
    });
});
