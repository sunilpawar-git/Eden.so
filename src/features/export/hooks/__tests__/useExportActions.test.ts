import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { exportStrings } from '../../strings/exportStrings';

const mockGetState = vi.fn().mockReturnValue({
    nodes: [
        { id: 'A', workspaceId: 'w1', type: 'idea', data: { heading: 'HA', output: 'OA' }, position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'B', workspaceId: 'w1', type: 'idea', data: { heading: 'HB', output: 'OB' }, position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date() },
    ],
    edges: [{ id: 'e1', workspaceId: 'w1', sourceNodeId: 'A', targetNodeId: 'B', relationshipType: 'related' }],
    selectedNodeIds: new Set(['A', 'B']),
});

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockTrack = vi.fn();

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: (...args: unknown[]) => mockGetState(...args),
    }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: (...args: unknown[]) => mockTrack(...args),
}));

const { useExportActions } = await import('../useExportActions');

describe('useExportActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
        mockGetState.mockReturnValue({
            nodes: [
                { id: 'A', workspaceId: 'w1', type: 'idea', data: { heading: 'HA', output: 'OA' }, position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date() },
                { id: 'B', workspaceId: 'w1', type: 'idea', data: { heading: 'HB', output: 'OB' }, position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date() },
            ],
            edges: [{ id: 'e1', workspaceId: 'w1', sourceNodeId: 'A', targetNodeId: 'B', relationshipType: 'related' }],
            selectedNodeIds: new Set(['A', 'B']),
        });
    });

    test('handleQuickCopy copies markdown to clipboard', async () => {
        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleQuickCopy(); });

        await vi.waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
    });

    test('handleQuickCopy shows toast.success on success', async () => {
        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleQuickCopy(); });

        await vi.waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith(exportStrings.labels.copied);
        });
    });

    test('handleQuickCopy tracks analytics event', () => {
        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleQuickCopy(); });
        expect(mockTrack).toHaveBeenCalledWith('branch_export', 'quick_copy');
    });

    test('handleQuickCopy shows error toast when no content', () => {
        mockGetState.mockReturnValueOnce({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });

        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleQuickCopy(); });
        expect(mockToastError).toHaveBeenCalledWith(exportStrings.labels.noContent);
    });

    test('handleOpenExport sets exportRoots', () => {
        const { result } = renderHook(() => useExportActions());
        expect(result.current.exportRoots).toBeNull();

        act(() => { result.current.handleOpenExport(); });
        expect(result.current.exportRoots).not.toBeNull();
        expect(result.current.exportRoots!.length).toBeGreaterThan(0);
    });

    test('clearExportRoots resets to null', () => {
        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleOpenExport(); });
        expect(result.current.exportRoots).not.toBeNull();

        act(() => { result.current.clearExportRoots(); });
        expect(result.current.exportRoots).toBeNull();
    });

    test('handleOpenExport shows error toast when no content', () => {
        mockGetState.mockReturnValueOnce({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });

        const { result } = renderHook(() => useExportActions());
        act(() => { result.current.handleOpenExport(); });
        expect(mockToastError).toHaveBeenCalledWith(exportStrings.labels.noContent);
        expect(result.current.exportRoots).toBeNull();
    });
});
