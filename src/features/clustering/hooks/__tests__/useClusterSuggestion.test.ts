import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { computeClustersAsync } from '@/workers/knowledgeWorkerClient';
import { labelClusters } from '../../services/clusterLabelService';
import { toast } from '@/shared/stores/toastStore';
import { useClusterSuggestion } from '../useClusterSuggestion';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useClusterPreviewStore } from '../../stores/clusterPreviewStore';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@/workers/knowledgeWorkerClient', () => ({
    computeClustersAsync: vi.fn(),
}));
vi.mock('../../services/clusterLabelService', () => ({
    labelClusters: vi.fn(),
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const mockCompute = vi.mocked(computeClustersAsync);
const mockLabel = vi.mocked(labelClusters);

function makeNode(id: string): CanvasNode {
    return { id, workspaceId: 'w1', type: 'idea', data: { heading: id }, position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date() } as CanvasNode;
}

const MOCK_CLUSTERS = [
    { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Cluster 1', colorIndex: 0 },
];

beforeEach(() => {
    vi.resetAllMocks();
    useClusterPreviewStore.getState().reset();
    useCanvasStore.getState().clearClusterGroups();
    useCanvasStore.getState().setNodes([makeNode('n1'), makeNode('n2'), makeNode('n3')]);
});

describe('useClusterSuggestion', () => {
    it('calls computeClusters with current nodes', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: ['n3'] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        expect(mockCompute).toHaveBeenCalledWith(useCanvasStore.getState().nodes);
    });

    it('calls labelClusters after computing', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        expect(mockLabel).toHaveBeenCalledTimes(1);
    });

    it('sets preview groups after successful labeling', async () => {
        const labeled = [{ ...MOCK_CLUSTERS[0]!, label: 'Themed' }];
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(labeled);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        expect(result.current.previewGroups).toEqual(labeled);
        expect(result.current.phase).toBe('preview');
    });

    it('acceptClusters commits to canvas store', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());
        act(() => result.current.acceptClusters());

        expect(useCanvasStore.getState().clusterGroups).toHaveLength(1);
        expect(result.current.phase).toBe('idle');
    });

    it('dismissClusters clears preview without store mutation', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());
        act(() => result.current.dismissClusters());

        expect(result.current.previewGroups).toBeNull();
        expect(result.current.phase).toBe('idle');
        expect(useCanvasStore.getState().clusterGroups).toHaveLength(0);
    });

    it('shows toast when no clusters found', async () => {
        mockCompute.mockResolvedValue({ clusters: [], unclustered: ['n1', 'n2', 'n3'] });

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        expect(toast.info).toHaveBeenCalled();
        expect(result.current.phase).toBe('idle');
    });

    it('resets phase and shows error toast on labeling failure', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockRejectedValue(new Error('API failure'));

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        expect(result.current.phase).toBe('idle');
        expect(result.current.previewGroups).toBeNull();
        expect(toast.error).toHaveBeenCalled();
    });

    it('ignores re-entrant calls while not idle', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        await act(() => result.current.suggestClusters());

        mockCompute.mockClear();
        await act(() => result.current.suggestClusters());
        expect(mockCompute).not.toHaveBeenCalled();
    });

    it('uses getState() for store reads (no stale closures)', async () => {
        mockCompute.mockResolvedValue({ clusters: MOCK_CLUSTERS, unclustered: [] });
        mockLabel.mockResolvedValue(MOCK_CLUSTERS);

        const { result } = renderHook(() => useClusterSuggestion());
        useCanvasStore.getState().setNodes([makeNode('x1'), makeNode('x2')]);
        await act(() => result.current.suggestClusters());

        expect(mockCompute).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: 'x1' })]),
        );
    });

    it('clearClusters removes accepted clusters from canvas store', () => {
        useCanvasStore.getState().setClusterGroups([...MOCK_CLUSTERS]);

        const { result } = renderHook(() => useClusterSuggestion());
        act(() => result.current.clearClusters());

        expect(useCanvasStore.getState().clusterGroups).toHaveLength(0);
    });

    it('clearClusters does not affect preview phase', () => {
        useCanvasStore.getState().setClusterGroups([...MOCK_CLUSTERS]);

        const { result } = renderHook(() => useClusterSuggestion());
        act(() => result.current.clearClusters());

        expect(result.current.phase).toBe('idle');
        expect(useCanvasStore.getState().clusterGroups).toEqual([]);
    });
});
