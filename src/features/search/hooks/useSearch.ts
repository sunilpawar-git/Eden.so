/**
 * useSearch Hook - Search across nodes in workspaces
 * BASB: Quick retrieval of captured ideas
 */
import { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { SearchResult } from '../types/search';

interface UseSearchReturn {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    search: (query: string) => void;
    clear: () => void;
}

export function useSearch(): UseSearchReturn {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const nodes = useCanvasStore((state) => state.nodes);
    const workspaces = useWorkspaceStore((state) => state.workspaces);

    const workspaceMap = useMemo(() => {
        const map = new Map<string, string>();
        workspaces.forEach((ws) => map.set(ws.id, ws.name));
        return map;
    }, [workspaces]);

    const results = useMemo((): SearchResult[] => {
        if (!query.trim()) {
            return [];
        }

        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        nodes.forEach((node) => {
            const prompt = node.data.prompt;
            const output = node.data.output;
            const workspaceId = node.workspaceId;
            const workspaceName = workspaceMap.get(workspaceId) ?? 'Unknown';

            // Search in prompt
            if (prompt.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    nodeId: node.id,
                    workspaceId,
                    workspaceName,
                    matchedContent: prompt,
                    matchType: 'prompt',
                    relevance: 1.0,
                });
            }

            // Search in output
            if (output?.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    nodeId: node.id,
                    workspaceId,
                    workspaceName,
                    matchedContent: output,
                    matchType: 'output',
                    relevance: 0.8,
                });
            }
        });

        // Sort by relevance
        return searchResults.sort((a, b) => b.relevance - a.relevance);
    }, [query, nodes, workspaceMap]);

    const search = useCallback((newQuery: string) => {
        setIsSearching(true);
        setQuery(newQuery);
        setIsSearching(false);
    }, []);

    const clear = useCallback(() => {
        setQuery('');
    }, []);

    return {
        query,
        results,
        isSearching,
        search,
        clear,
    };
}
