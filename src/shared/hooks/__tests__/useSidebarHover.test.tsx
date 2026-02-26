/**
 * useSidebarHover Hook Tests — hover, Escape key, cleanup
 * Uses a wrapper component to properly test ref-based event listeners
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useSidebarHover } from '../useSidebarHover';

let mockIsPinned = true;
let mockIsHoverOpen = false;
const mockSetHoverOpen = vi.fn();

const buildSidebarState = () => ({
    isPinned: mockIsPinned,
    isHoverOpen: mockIsHoverOpen,
    togglePin: vi.fn(),
    setHoverOpen: mockSetHoverOpen,
});

vi.mock('@/shared/stores/sidebarStore', () => {
    const selectorFn = vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
        return typeof selector === 'function' ? selector(buildSidebarState()) : buildSidebarState();
    });
    Object.assign(selectorFn, { getState: () => buildSidebarState() });
    return { useSidebarStore: selectorFn };
});

function TestWrapper() {
    const { triggerZoneRef } = useSidebarHover();
    return (
        <div ref={triggerZoneRef} data-testid="trigger-zone">
            Trigger Content
        </div>
    );
}

describe('useSidebarHover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsPinned = true;
        mockIsHoverOpen = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render trigger zone element', () => {
        render(<TestWrapper />);
        expect(screen.getByTestId('trigger-zone')).toBeInTheDocument();
    });

    it('should NOT call setHoverOpen on mouseenter when pinned', () => {
        mockIsPinned = true;
        render(<TestWrapper />);
        fireEvent.mouseEnter(screen.getByTestId('trigger-zone'));
        expect(mockSetHoverOpen).not.toHaveBeenCalled();
    });

    it('should call setHoverOpen(true) on mouseenter when unpinned', () => {
        mockIsPinned = false;
        render(<TestWrapper />);
        fireEvent.mouseEnter(screen.getByTestId('trigger-zone'));
        expect(mockSetHoverOpen).toHaveBeenCalledWith(true);
    });

    it('should call setHoverOpen(false) on mouseleave when unpinned', () => {
        mockIsPinned = false;
        render(<TestWrapper />);
        fireEvent.mouseLeave(screen.getByTestId('trigger-zone'));
        expect(mockSetHoverOpen).toHaveBeenCalledWith(false);
    });

    describe('Escape key', () => {
        it('should close hover sidebar on Escape when unpinned and open', () => {
            mockIsPinned = false;
            mockIsHoverOpen = true;
            render(<TestWrapper />);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).toHaveBeenCalledWith(false);
        });

        it('should NOT react to Escape when pinned', () => {
            mockIsPinned = true;
            mockIsHoverOpen = false;
            render(<TestWrapper />);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });

        it('should NOT react to Escape when hover is already closed', () => {
            mockIsPinned = false;
            mockIsHoverOpen = false;
            render(<TestWrapper />);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });

        it('should NOT close sidebar on Escape when focus is in an input', () => {
            mockIsPinned = false;
            mockIsHoverOpen = true;
            render(
                <div>
                    <TestWrapper />
                    <input data-testid="text-input" />
                </div>
            );
            const input = screen.getByTestId('text-input');
            input.focus();
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });

        it('should NOT close sidebar on Escape when focus is in a textarea', () => {
            mockIsPinned = false;
            mockIsHoverOpen = true;
            render(
                <div>
                    <TestWrapper />
                    <textarea data-testid="text-area" />
                </div>
            );
            screen.getByTestId('text-area').focus();
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });
    });

    describe('cleanup on unmount', () => {
        it('should not call setHoverOpen after unmount on mouseenter', () => {
            mockIsPinned = false;
            const { unmount } = render(<TestWrapper />);
            const zone = screen.getByTestId('trigger-zone');
            unmount();
            mockSetHoverOpen.mockClear();
            zone.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });

        it('should not call setHoverOpen after unmount on Escape', () => {
            mockIsPinned = false;
            mockIsHoverOpen = true;
            const { unmount } = render(<TestWrapper />);
            unmount();
            mockSetHoverOpen.mockClear();
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockSetHoverOpen).not.toHaveBeenCalled();
        });
    });
});
