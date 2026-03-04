/**
 * useDocumentAgent Hook Tests — orchestration, gating, atomic dispatch
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { createMockExtraction } from './fixtures/extractionFixtures';

const mockResult = createMockExtraction();

const { mockSetState, mockAutoAnalyzeRef, mockHasAccessRef, mockUpdateNodeAttachments, mockNode } = vi.hoisted(() => ({
    mockSetState: vi.fn(),
    mockAutoAnalyzeRef: { value: true },
    mockHasAccessRef: { value: true },
    mockUpdateNodeAttachments: vi.fn(),
    mockNode: {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: {
            heading: 'Test',
            colorKey: undefined as string | undefined,
            attachments: [{ filename: 'file.pdf', parsedTextUrl: 'https://example.com/text' }],
        },
    },
}));

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(
        vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
            const state = { autoAnalyzeDocuments: mockAutoAnalyzeRef.value, canvasFreeFlow: false };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            getState: () => ({ autoAnalyzeDocuments: mockAutoAnalyzeRef.value, canvasFreeFlow: false }),
        },
    ),
}));

vi.mock('@/features/subscription/stores/subscriptionStore', () => ({
    useSubscriptionStore: Object.assign(
        vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
            const state = { hasAccess: () => mockHasAccessRef.value };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            getState: () => ({ hasAccess: () => mockHasAccessRef.value }),
        },
    ),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
            const state = { nodes: [mockNode], edges: [] };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            getState: () => ({
                nodes: [mockNode],
                edges: [],
                updateNodeAttachments: mockUpdateNodeAttachments,
            }),
            setState: mockSetState,
        },
    ),
    getNodeMap: vi.fn().mockReturnValue(new Map([['node-1', mockNode]])),
}));

vi.mock('../services/documentAgentService', () => ({
    analyzeDocument: vi.fn(),
}));

vi.mock('../services/extractionCacheService', () => ({
    cacheExtraction: vi.fn((_meta: unknown, _result: unknown) => ({
        filename: 'file.pdf',
        parsedTextUrl: 'https://example.com/text',
        extraction: _result,
        analyzedAt: Date.now(),
    })),
}));

vi.mock('../services/insightNodeBuilder', () => ({
    buildInsightSpawn: vi.fn().mockReturnValue({
        node: { id: 'insight-123', data: {} },
        edge: { id: 'edge-123', sourceNodeId: 'node-1', targetNodeId: 'insight-123' },
    }),
    calculateInsightPosition: vi.fn().mockReturnValue({ x: 300, y: 0 }),
}));

vi.mock('@/features/canvas/types/node', () => ({
    normalizeNodeColorKey: vi.fn((v: unknown) => (typeof v === 'string' ? v : 'default')),
    createIdeaNode: vi.fn(),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));
vi.mock('@/shared/services/analyticsService', () => ({
    trackDocumentAgentTriggered: vi.fn(),
    trackDocumentAgentCompleted: vi.fn(),
    trackDocumentAgentFailed: vi.fn(),
}));
vi.mock('@/features/subscription/types/subscription', () => ({
    GATED_FEATURES: { documentIntelligence: 'documentIntelligence' },
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { useDocumentAgent } from '../hooks/useDocumentAgent';
import { analyzeDocument } from '../services/documentAgentService';
import { buildInsightSpawn } from '../services/insightNodeBuilder';
import { toast } from '@/shared/stores/toastStore';
import { captureError } from '@/shared/services/sentryService';
import {
    trackDocumentAgentTriggered,
    trackDocumentAgentCompleted,
    trackDocumentAgentFailed,
} from '@/shared/services/analyticsService';
/* eslint-enable import-x/first */

const mockAnalyze = vi.mocked(analyzeDocument);

describe('useDocumentAgent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAutoAnalyzeRef.value = true;
        mockHasAccessRef.value = true;
        mockAnalyze.mockResolvedValue(mockResult);
    });

    it('calls analyzeDocument with correct args on success path', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'doc text', 'file.pdf', 'ws-1');
        });

        expect(mockAnalyze).toHaveBeenCalledWith('doc text', 'file.pdf');
    });

    it('dispatches to canvasStore.setState (not addNode/addEdge) on success', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(mockSetState).toHaveBeenCalledTimes(1);
    });

    it('returns immediately when autoAnalyze is false (no API call)', async () => {
        mockAutoAnalyzeRef.value = false;
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(mockAnalyze).not.toHaveBeenCalled();
    });

    it('bypasses autoAnalyze check when isManual is true', async () => {
        mockAutoAnalyzeRef.value = false;
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1', true);
        });

        expect(mockAnalyze).toHaveBeenCalledWith('text', 'file.pdf');
    });

    it('returns immediately when hasAccess is false (no API call)', async () => {
        mockHasAccessRef.value = false;
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(mockAnalyze).not.toHaveBeenCalled();
    });

    it('shows feature-locked toast when hasAccess is false and isManual is true', async () => {
        mockHasAccessRef.value = false;
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1', true);
        });

        expect(toast.info).toHaveBeenCalledWith(strings.subscription.featureLocked);
        expect(mockAnalyze).not.toHaveBeenCalled();
    });

    it('shows analyzing toast on start', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(toast.info).toHaveBeenCalledWith(strings.documentAgent.analyzing);
    });

    it('shows success toast on completion', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(toast.success).toHaveBeenCalledWith(strings.documentAgent.analysisComplete);
    });

    it('shows error toast on failure and does not throw', async () => {
        mockAnalyze.mockRejectedValue(new Error('API error'));
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(toast.error).toHaveBeenCalled();
        expect(captureError).toHaveBeenCalled();
    });

    it('tracks triggered event on start', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(trackDocumentAgentTriggered).toHaveBeenCalledWith('file.pdf');
    });

    it('tracks completed event on success', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(trackDocumentAgentCompleted).toHaveBeenCalledWith('invoice', 'high');
    });

    it('tracks failed event on error', async () => {
        mockAnalyze.mockRejectedValue(new Error('timeout'));
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(trackDocumentAgentFailed).toHaveBeenCalled();
    });

    it('caches extraction result on success by calling updateNodeAttachments', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1');
        });

        expect(mockUpdateNodeAttachments).toHaveBeenCalledWith('node-1', expect.any(Array));
    });

    it('passes parent node colorKey to buildInsightSpawn', async () => {
        mockNode.data.colorKey = 'danger';
        const { result } = renderHook(() => useDocumentAgent());
        await act(async () => { await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1'); });
        expect(buildInsightSpawn).toHaveBeenCalledWith(
            'node-1', 'ws-1', expect.any(Object), expect.any(Object), 'file.pdf', 'danger',
        );
        mockNode.data.colorKey = undefined;
    });

    it('passes default when parent has no colorKey', async () => {
        mockNode.data.colorKey = undefined;
        const { result } = renderHook(() => useDocumentAgent());
        await act(async () => { await result.current.analyzeAndSpawn('node-1', 'text', 'file.pdf', 'ws-1'); });
        expect(buildInsightSpawn).toHaveBeenCalledWith(
            'node-1', 'ws-1', expect.any(Object), expect.any(Object), 'file.pdf', 'default',
        );
    });

    it('agentState starts as idle', () => {
        const { result } = renderHook(() => useDocumentAgent());

        expect(result.current.agentState.status).toBe('idle');
    });
});
