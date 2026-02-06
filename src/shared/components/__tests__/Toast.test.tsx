/**
 * Tests for Toast component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '../Toast';
import { useToastStore } from '../../stores/toastStore';

// Mock the toast store
vi.mock('../../stores/toastStore', () => ({
    useToastStore: vi.fn(() => ({
        toasts: [],
        removeToast: vi.fn(),
    })),
}));

// Mock CSS module
vi.mock('../Toast.module.css', () => ({
    default: {
        container: 'container',
        toast: 'toast',
        success: 'success',
        error: 'error',
        info: 'info',
        message: 'message',
        close: 'close',
    },
}));

describe('ToastContainer', () => {
    const mockRemoveToast = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render nothing when there are no toasts', () => {
        vi.mocked(useToastStore).mockReturnValue({
            toasts: [],
            removeToast: mockRemoveToast,
        } as unknown as ReturnType<typeof useToastStore>);

        const { container } = render(<ToastContainer />);
        expect(container.firstChild).toBeNull();
    });

    it('should render toast messages', () => {
        vi.mocked(useToastStore).mockReturnValue({
            toasts: [
                { id: 'toast-1', message: 'Success message', type: 'success' },
                { id: 'toast-2', message: 'Error message', type: 'error' },
            ],
            removeToast: mockRemoveToast,
        } as unknown as ReturnType<typeof useToastStore>);

        render(<ToastContainer />);

        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should call removeToast when close button is clicked', () => {
        vi.mocked(useToastStore).mockReturnValue({
            toasts: [{ id: 'toast-1', message: 'Test message', type: 'info' }],
            removeToast: mockRemoveToast,
        } as unknown as ReturnType<typeof useToastStore>);

        render(<ToastContainer />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);

        expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
    });

    it('should apply correct CSS class based on toast type', () => {
        vi.mocked(useToastStore).mockReturnValue({
            toasts: [{ id: 'toast-1', message: 'Success!', type: 'success' }],
            removeToast: mockRemoveToast,
        } as unknown as ReturnType<typeof useToastStore>);

        render(<ToastContainer />);

        const toast = screen.getByText('Success!').closest('.toast');
        expect(toast).toHaveClass('success');
    });

    it('should render multiple toasts with unique keys', () => {
        vi.mocked(useToastStore).mockReturnValue({
            toasts: [
                { id: 'toast-1', message: 'First', type: 'info' },
                { id: 'toast-2', message: 'Second', type: 'info' },
                { id: 'toast-3', message: 'Third', type: 'info' },
            ],
            removeToast: mockRemoveToast,
        } as unknown as ReturnType<typeof useToastStore>);

        render(<ToastContainer />);

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
    });
});
