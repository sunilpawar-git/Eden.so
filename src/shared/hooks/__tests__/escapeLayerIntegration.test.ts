/**
 * Escape Layer Integration Tests
 * Verifies the "dismiss-from-top" pattern across real application layers.
 * Simulates scenarios where multiple Escape-dismissable surfaces are open.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeLayer } from '../useEscapeLayer';
import { _resetEscapeLayer, _getActiveEntryCount } from '../useEscapeLayer.testUtils';
import { ESCAPE_PRIORITY } from '../escapePriorities';
import { pressEscape } from './helpers/escapeTestHelpers';

describe('Escape Layer Integration', () => {
    beforeEach(() => {
        _resetEscapeLayer();
    });

    describe('modal over settings panel', () => {
        it('first Escape closes modal, second closes settings', () => {
            const closeSettings = vi.fn();
            const closeModal = vi.fn();

            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, closeSettings));
            const { rerender: rerenderModal } = renderHook(
                ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.MODAL, active, closeModal),
                { initialProps: { active: true } },
            );

            pressEscape();
            expect(closeModal).toHaveBeenCalledOnce();
            expect(closeSettings).not.toHaveBeenCalled();

            rerenderModal({ active: false });
            pressEscape();
            expect(closeSettings).toHaveBeenCalledOnce();
        });
    });

    describe('focus mode with sidebar open', () => {
        it('Escape closes focus mode (higher priority), sidebar remains', () => {
            const closeSidebar = vi.fn();
            const exitFocus = vi.fn();

            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.SIDEBAR_HOVER, true, closeSidebar));
            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.FOCUS_MODE, true, exitFocus));

            pressEscape();
            expect(exitFocus).toHaveBeenCalledOnce();
            expect(closeSidebar).not.toHaveBeenCalled();
        });
    });

    describe('KB panel over focus mode', () => {
        it('Escape closes KB panel first, then focus mode', () => {
            const exitFocus = vi.fn();
            const closeKB = vi.fn();

            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.FOCUS_MODE, true, exitFocus));
            const { rerender: rerenderKB } = renderHook(
                ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.KB_PANEL, active, closeKB),
                { initialProps: { active: true } },
            );

            pressEscape();
            expect(closeKB).toHaveBeenCalledOnce();
            expect(exitFocus).not.toHaveBeenCalled();

            rerenderKB({ active: false });
            pressEscape();
            expect(exitFocus).toHaveBeenCalledOnce();
        });
    });

    describe('bar overflow with canvas selection', () => {
        it('Escape closes bar overflow instead of clearing selection', () => {
            const clearSelection = vi.fn();
            const closeOverflow = vi.fn();

            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, true, clearSelection));
            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.BAR_OVERFLOW, true, closeOverflow));

            pressEscape();
            expect(closeOverflow).toHaveBeenCalledOnce();
            expect(clearSelection).not.toHaveBeenCalled();
        });
    });

    describe('full priority chain teardown', () => {
        it('layers deactivate top-down, each Escape hits the next layer', () => {
            const handlers = {
                clearSelection: vi.fn(),
                sidebar: vi.fn(),
                barPin: vi.fn(),
                barOverflow: vi.fn(),
                focus: vi.fn(),
            };

            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, true, handlers.clearSelection));
            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.SIDEBAR_HOVER, true, handlers.sidebar));
            const { rerender: rBarPin } = renderHook(
                ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.BAR_PIN, active, handlers.barPin),
                { initialProps: { active: true } },
            );
            const { rerender: rBarOvf } = renderHook(
                ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.BAR_OVERFLOW, active, handlers.barOverflow),
                { initialProps: { active: true } },
            );
            const { rerender: rFocus } = renderHook(
                ({ active }) => useEscapeLayer(ESCAPE_PRIORITY.FOCUS_MODE, active, handlers.focus),
                { initialProps: { active: true } },
            );

            expect(_getActiveEntryCount()).toBe(5);

            pressEscape();
            expect(handlers.focus).toHaveBeenCalledOnce();

            rFocus({ active: false });
            pressEscape();
            expect(handlers.barOverflow).toHaveBeenCalledOnce();

            rBarOvf({ active: false });
            pressEscape();
            expect(handlers.barPin).toHaveBeenCalledOnce();

            rBarPin({ active: false });
            pressEscape();
            expect(handlers.sidebar).toHaveBeenCalledOnce();
        });
    });

    describe('no active layers', () => {
        it('Escape does nothing when all layers are inactive', () => {
            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.MODAL, false, vi.fn()));
            renderHook(() => useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, false, vi.fn()));
            expect(_getActiveEntryCount()).toBe(0);
            expect(() => pressEscape()).not.toThrow();
        });
    });
});
