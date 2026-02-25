/**
 * useOverflowAutoOpen Tests — TDD
 * Hook managing overflow open state:
 *   - auto-opens after 600ms hover
 *   - auto-close on mouseleave ONLY when auto-opened (not manual)
 *   - manual toggle via ••• click
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOverflowAutoOpen } from '../useOverflowAutoOpen';

describe('useOverflowAutoOpen', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('starts closed', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        expect(result.current.isOpen).toBe(false);
    });

    it('opens after 600ms of hover', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(600); });
        expect(result.current.isOpen).toBe(true);
    });

    it('does NOT open if mouse leaves before 600ms', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(400); });
        act(() => { result.current.handleMouseLeave(); });
        expect(result.current.isOpen).toBe(false);
    });

    it('auto-closes on mouseleave when auto-opened', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(600); });
        expect(result.current.isOpen).toBe(true);
        act(() => { result.current.handleMouseLeave(); });
        expect(result.current.isOpen).toBe(false);
    });

    it('does NOT auto-close on mouseleave when manually opened', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.toggle(); });
        expect(result.current.isOpen).toBe(true);
        act(() => { result.current.handleMouseLeave(); });
        expect(result.current.isOpen).toBe(true);
    });

    it('toggle opens when closed', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.toggle(); });
        expect(result.current.isOpen).toBe(true);
    });

    it('toggle closes when open', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.toggle(); });
        act(() => { result.current.toggle(); });
        expect(result.current.isOpen).toBe(false);
    });

    it('toggle cancels pending auto-open timer', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(300); }); // mid-way
        act(() => { result.current.toggle(); }); // manual open
        expect(result.current.isOpen).toBe(true);
        // Let remaining timer fire — should NOT double-toggle
        act(() => { vi.advanceTimersByTime(300); });
        expect(result.current.isOpen).toBe(true);
    });

    it('handles rapid mouseenter → mouseleave → mouseenter without stale timer', () => {
        const { result } = renderHook(() => useOverflowAutoOpen());
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(300); });
        act(() => { result.current.handleMouseLeave(); });
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(600); });
        expect(result.current.isOpen).toBe(true);
    });

    it('respects custom delay', () => {
        const { result } = renderHook(() => useOverflowAutoOpen(300));
        act(() => { result.current.handleMouseEnter(); });
        act(() => { vi.advanceTimersByTime(299); });
        expect(result.current.isOpen).toBe(false);
        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current.isOpen).toBe(true);
    });
});
