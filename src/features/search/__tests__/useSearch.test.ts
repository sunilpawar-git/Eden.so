/**
 * useSearch Hook Tests
 * TDD: Tests for search functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

describe('useSearch', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'React hooks', output: 'Hooks are a way to use state in functional components' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'node-2',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'TypeScript basics', output: 'TypeScript adds types to JavaScript' },
                    position: { x: 100, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'node-3',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'CSS Grid', output: 'Grid layout for complex layouts' },
                    position: { x: 200, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [{ 
                id: 'ws-1', 
                userId: 'user-1',
                name: 'My Workspace', 
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), 
                updatedAt: new Date() 
            }],
        });
    });

    it('should return empty results for empty query', () => {
        const { result } = renderHook(() => useSearch());

        expect(result.current.results).toHaveLength(0);
        expect(result.current.query).toBe('');
    });

    it('should search prompt content', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('React');
        });

        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]?.nodeId).toBe('node-1');
    });

    it('should search output content', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('functional components');
        });

        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]?.matchType).toBe('output');
    });

    it('should be case insensitive', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('typescript');
        });

        // TypeScript appears in both prompt and output of node-2
        expect(result.current.results.length).toBeGreaterThanOrEqual(1);
        expect(result.current.results.some(r => r.nodeId === 'node-2')).toBe(true);
    });

    it('should return multiple results', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('layout');
        });

        expect(result.current.results.length).toBeGreaterThanOrEqual(1);
    });

    it('should clear results', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('React');
        });
        expect(result.current.results).toHaveLength(1);

        act(() => {
            result.current.clear();
        });
        expect(result.current.results).toHaveLength(0);
        expect(result.current.query).toBe('');
    });

    it('should include workspace info in results', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('React');
        });

        expect(result.current.results[0]?.workspaceId).toBe('ws-1');
        expect(result.current.results[0]?.workspaceName).toBe('My Workspace');
    });

    it('should highlight matched content', () => {
        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('TypeScript');
        });

        expect(result.current.results[0]?.matchedContent).toContain('TypeScript');
    });

    it('should handle nodes with empty prompt', () => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-empty',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: '', output: 'This is output content' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });

        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('output');
        });

        // Should find match in output, not crash on empty prompt
        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]?.matchType).toBe('output');
    });

    it('should handle nodes with undefined output', () => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-no-output',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'Test prompt', output: undefined },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });

        const { result } = renderHook(() => useSearch());

        act(() => {
            result.current.search('Test');
        });

        // Should find match in prompt, not crash on undefined output
        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0]?.matchType).toBe('prompt');
    });
});
