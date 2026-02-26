/**
 * useEscapeLayer — Unit tests for centralized Escape key priority system.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useEscapeLayer } from '../useEscapeLayer';
import { _resetEscapeLayer, _getActiveEntryCount } from '../useEscapeLayer.testUtils';
import { ESCAPE_PRIORITY } from '../escapePriorities';
import { pressEscape } from './helpers/escapeTestHelpers';

describe('useEscapeLayer', () => {
    beforeEach(() => {
        _resetEscapeLayer();
    });

    it('fires handler when Escape is pressed and layer is active', () => {
        const handler = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, handler));
        pressEscape();
        expect(handler).toHaveBeenCalledOnce();
    });

    it('does NOT fire handler when layer is inactive', () => {
        const handler = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, false, handler));
        pressEscape();
        expect(handler).not.toHaveBeenCalled();
    });

    it('fires only the highest-priority handler when multiple are active', () => {
        const low = vi.fn();
        const high = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, true, low));
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, high));
        pressEscape();
        expect(high).toHaveBeenCalledOnce();
        expect(low).not.toHaveBeenCalled();
    });

    it('falls back to next handler when higher-priority layer deactivates', () => {
        const low = vi.fn();
        const high = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, true, low));
        const { rerender } = renderHook(
            ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.MODAL, active, high),
            { initialProps: { active: true } },
        );

        rerender({ active: false });
        pressEscape();
        expect(low).toHaveBeenCalledOnce();
        expect(high).not.toHaveBeenCalled();
    });

    it('removes entry when component unmounts', () => {
        const handler = vi.fn();
        const { unmount } = renderHook(() =>
            useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, handler),
        );
        expect(_getActiveEntryCount()).toBe(1);
        unmount();
        expect(_getActiveEntryCount()).toBe(0);
    });

    it('ignores non-Escape keys', () => {
        const handler = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, handler));
        fireEvent.keyDown(document, { key: 'Enter' });
        expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing when no entries are registered', () => {
        expect(() => pressEscape()).not.toThrow();
    });

    it('stops propagation when a handler fires', () => {
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, vi.fn()));
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        document.dispatchEvent(event);
        expect(stopSpy).toHaveBeenCalledOnce();
    });

    it('does NOT stop propagation when no handler is active', () => {
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, false, vi.fn()));
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        document.dispatchEvent(event);
        expect(stopSpy).not.toHaveBeenCalled();
    });

    it('uses latest handler reference without re-registering', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        const { rerender } = renderHook(
            ({ fn }) => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, fn),
            { initialProps: { fn: handler1 } },
        );

        rerender({ fn: handler2 });
        pressEscape();
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledOnce();
    });

    it('supports multiple same-priority entries (latest wins)', () => {
        const first = vi.fn();
        const second = vi.fn();
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, first));
        renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, second));
        pressEscape();
        expect(second).toHaveBeenCalledOnce();
        expect(first).not.toHaveBeenCalled();
    });

    it('tracks active entry count correctly', () => {
        expect(_getActiveEntryCount()).toBe(0);

        const { unmount: u1 } = renderHook(() =>
            useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, true, vi.fn()),
        );
        const { unmount: u2 } = renderHook(() =>
            useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, vi.fn()),
        );
        expect(_getActiveEntryCount()).toBe(2);

        u1();
        expect(_getActiveEntryCount()).toBe(1);
        u2();
        expect(_getActiveEntryCount()).toBe(0);
    });
});

describe('escapePriorities', () => {
    it('defines strictly ordered priorities', () => {
        const values = Object.values(ESCAPE_PRIORITY);
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
    });

    it('MODAL has highest priority', () => {
        const max = Math.max(...Object.values(ESCAPE_PRIORITY));
        expect(ESCAPE_PRIORITY.MODAL).toBe(max);
    });

    it('CLEAR_SELECTION has lowest priority', () => {
        const min = Math.min(...Object.values(ESCAPE_PRIORITY));
        expect(ESCAPE_PRIORITY.CLEAR_SELECTION).toBe(min);
    });
});
