/**
 * useToolbarDrag Unit Tests — Drag state management hook.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolbarDrag } from '../sections/useToolbarDrag';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DEFAULT_UTILS_BAR_LAYOUT } from '@/features/canvas/types/utilsBarLayout';
import {
    createLocalStorageMock,
    createMockMatchMedia,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

function makeDragEvent(overrides: Partial<DragEvent> = {}): React.DragEvent {
    return {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: null,
        ...overrides,
    } as unknown as React.DragEvent;
}

describe('useToolbarDrag', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        useSettingsStore.setState({ utilsBarLayout: DEFAULT_UTILS_BAR_LAYOUT });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('initializes with null draggedId and dropTargetId', () => {
        const { result } = renderHook(() => useToolbarDrag());
        expect(result.current.draggedId).toBeNull();
        expect(result.current.dropTargetId).toBeNull();
    });

    it('handleDragStart sets draggedId', () => {
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDragStart('ai')(makeDragEvent());
        });
        expect(result.current.draggedId).toBe('ai');
    });

    it('handleDragOver sets dropTargetId', () => {
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDragStart('ai')(makeDragEvent());
            result.current.handleDragOver('connect', 1, 1)(makeDragEvent());
        });
        expect(result.current.dropTargetId).toBe('connect');
    });

    it('handleDragEnd clears both draggedId and dropTargetId', () => {
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDragStart('ai')(makeDragEvent());
            result.current.handleDragOver('connect', 1, 1)(makeDragEvent());
        });
        act(() => { result.current.handleDragEnd(); });
        expect(result.current.draggedId).toBeNull();
        expect(result.current.dropTargetId).toBeNull();
    });

    it('handleDrop calls reorderUtilsBarAction and clears state', () => {
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDragStart('ai')(makeDragEvent());
        });
        act(() => {
            result.current.handleDrop('connect', 1, 1)(makeDragEvent());
        });
        expect(result.current.draggedId).toBeNull();
        const { deck1 } = useSettingsStore.getState().utilsBarLayout;
        // 'ai' moved to index 1, so it should be at position 1
        expect(deck1[1]).toBe('ai');
    });

    it('handleDrop with same source and target is no-op', () => {
        const before = useSettingsStore.getState().utilsBarLayout;
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDragStart('ai')(makeDragEvent());
            result.current.handleDrop('ai', 1, 0)(makeDragEvent());
        });
        expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
    });

    it('handleDrop with no prior dragStart is a no-op', () => {
        const before = useSettingsStore.getState().utilsBarLayout;
        const { result } = renderHook(() => useToolbarDrag());
        act(() => {
            result.current.handleDrop('connect', 1, 1)(makeDragEvent());
        });
        expect(useSettingsStore.getState().utilsBarLayout).toBe(before);
    });

    it('handleDragOver calls preventDefault', () => {
        const { result } = renderHook(() => useToolbarDrag());
        const e = makeDragEvent();
        act(() => {
            result.current.handleDragOver('ai', 1, 0)(e);
        });
        expect(e.preventDefault).toHaveBeenCalled();
    });
});
