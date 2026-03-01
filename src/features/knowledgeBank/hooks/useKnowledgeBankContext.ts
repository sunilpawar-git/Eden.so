/**
 * useKnowledgeBankContext Hook — Builds formatted context from enabled KB entries
 * Delegates to hierarchical context builder for 4-level structured output.
 * Maintains backward-compatible interface (getKBContext returns a string).
 */
import { useCallback } from 'react';
import { useKnowledgeBankStore } from '@/features/knowledgeBank/stores/knowledgeBankStore';
import type { KBGenerationType } from '@/features/knowledgeBank/types/knowledgeBank';
import { buildHierarchicalKBContext } from '@/features/knowledgeBank/services/hierarchicalContextBuilder';

/**
 * Backward-compatible alias for buildHierarchicalKBContext.
 * @deprecated Use buildHierarchicalKBContext directly.
 */
export function buildKBContextBlock(
    entries: Parameters<typeof buildHierarchicalKBContext>[0],
    prompt?: string,
    generationType?: KBGenerationType
): string {
    return buildHierarchicalKBContext(entries, prompt, generationType);
}

/**
 * Hook that provides the current workspace KB context string.
 * Accepts an optional prompt to rank entries by relevance.
 */
export function useKnowledgeBankContext() {
    const getKBContext = useCallback((prompt?: string, generationType?: KBGenerationType): string => {
        const entries = useKnowledgeBankStore.getState().getEnabledEntries();
        return buildHierarchicalKBContext(entries, prompt, generationType);
    }, []);

    return { getKBContext };
}
