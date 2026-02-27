/**
 * Tests for Toast component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '../Toast';
// useToastStore is mocked below - no direct import needed

// Mock the toast store - must handle selector pattern and getState()
const mockRemoveToastFn = vi.fn();
let mockToasts: Array<{ id: string; message: string; type: string }> = [];
vi.mock('../../stores/toastStore', () => ({
    useToastStore: Object.assign(
        vi.fn((selector?: (s: { toasts: typeof mockToasts; removeToast: typeof mockRemoveToastFn }) => unknown) => {
            const state = { toasts: mockToasts, removeToast: mockRemoveToastFn };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            getState: () => ({ toasts: mockToasts, removeToast: mockRemoveToastFn }),
        }
    ),
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
    beforeEach(() => {
        vi.clearAllMocks();
        mockToasts = [];
    });

    it('should render nothing when there are no toasts', () => {
        mockToasts = [];
        const { container } = render(<ToastContainer />);
        expect(container.firstChild).toBeNull();
    });

    it('should render toast messages', () => {
        mockToasts = [
            { id: 'toast-1', message: 'Success message', type: 'success' },
            { id: 'toast-2', message: 'Error message', type: 'error' },
        ];

        render(<ToastContainer />);

        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should call removeToast when close button is clicked', () => {
        mockToasts = [{ id: 'toast-1', message: 'Test message', type: 'info' }];

        render(<ToastContainer />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);

        expect(mockRemoveToastFn).toHaveBeenCalledWith('toast-1');
    });

    it('should apply correct CSS class based on toast type', () => {
        mockToasts = [{ id: 'toast-1', message: 'Success!', type: 'success' }];

        render(<ToastContainer />);

        const toast = screen.getByText('Success!').closest('.toast');
        expect(toast).toHaveClass('success');
    });

    it('should render multiple toasts with unique keys', () => {
        mockToasts = [
            { id: 'toast-1', message: 'First', type: 'info' },
            { id: 'toast-2', message: 'Second', type: 'info' },
            { id: 'toast-3', message: 'Third', type: 'info' },
        ];

        render(<ToastContainer />);

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
    });
});
