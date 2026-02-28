/**
 * useDataExport Tests — JSON export with sanitization and no reactive subscriptions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import { useDataExport } from '../useDataExport';

const mockState = {
    nodes: [
        {
            id: 'n1', type: 'idea', position: { x: 0, y: 0 }, data: { prompt: 'Hello' },
            workspaceId: 'ws-1', width: 300, height: 200, createdAt: new Date(), updatedAt: new Date(),
        },
    ],
    edges: [
        {
            id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', relationshipType: 'related',
            workspaceId: 'ws-1',
        },
    ],
};

vi.mock('@/features/canvas/stores/canvasStore', () => {
    const selectorFn = vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
        return typeof selector === 'function' ? selector(mockState) : mockState;
    });
    Object.assign(selectorFn, { getState: () => mockState });
    return { useCanvasStore: selectorFn };
});

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

describe('useDataExport', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockClick = vi.fn();
        mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
        mockRevokeObjectURL = vi.fn();

        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: mockCreateObjectURL,
            revokeObjectURL: mockRevokeObjectURL,
        });

        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'a') {
                return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
            }
            return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns a stable exportData function (no reactive subscriptions)', () => {
        const { result, rerender } = renderHook(() => useDataExport());
        const firstRef = result.current.exportData;
        rerender();
        expect(result.current.exportData).toBe(firstRef);
    });

    it('creates a blob with sanitized JSON content', () => {
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });

        expect(mockCreateObjectURL).toHaveBeenCalledOnce();
        const blob = mockCreateObjectURL.mock.calls[0]![0] as Blob;
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');
    });

    it('strips sensitive fields from nodes (only allows id, type, position, data)', () => {
        const stringifySpy = vi.spyOn(JSON, 'stringify');
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });

        const parsed = JSON.parse(stringifySpy.mock.results[0]!.value as string);
        expect(parsed.nodes[0]).toEqual({
            id: 'n1', type: 'idea', position: { x: 0, y: 0 }, data: { prompt: 'Hello' },
        });
        expect(parsed.nodes[0]).not.toHaveProperty('workspaceId');
        expect(parsed.nodes[0]).not.toHaveProperty('createdAt');
        expect(parsed.nodes[0]).not.toHaveProperty('updatedAt');
        stringifySpy.mockRestore();
    });

    it('strips sensitive fields from edges (only allows id, sourceNodeId, targetNodeId, relationshipType)', () => {
        const stringifySpy = vi.spyOn(JSON, 'stringify');
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });

        const parsed = JSON.parse(stringifySpy.mock.results[0]!.value as string);
        expect(parsed.edges[0]).toEqual({
            id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', relationshipType: 'related',
        });
        expect(parsed.edges[0]).not.toHaveProperty('workspaceId');
        stringifySpy.mockRestore();
    });

    it('triggers a download click', () => {
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });
        expect(mockClick).toHaveBeenCalledOnce();
    });

    it('revokes the object URL after a delay', () => {
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });
        expect(mockRevokeObjectURL).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(200); });
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('tracks the export event in analytics', () => {
        const { result } = renderHook(() => useDataExport());
        act(() => { result.current.exportData(); });
        expect(trackSettingsChanged).toHaveBeenCalledWith('data_export', 'triggered');
    });
});
