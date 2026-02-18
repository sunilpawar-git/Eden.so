/**
 * useSidebarHover Hook Tests — hover open/close for unpinned sidebar
 * Uses a wrapper component to properly test ref-based event listeners
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useSidebarHover } from '../useSidebarHover';

let mockIsPinned = true;
const mockSetHoverOpen = vi.fn();

vi.mock('@/shared/stores/sidebarStore', () => ({
    useSidebarStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
        const state = {
            isPinned: mockIsPinned,
            isHoverOpen: false,
            togglePin: vi.fn(),
            setHoverOpen: mockSetHoverOpen,
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

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
});
