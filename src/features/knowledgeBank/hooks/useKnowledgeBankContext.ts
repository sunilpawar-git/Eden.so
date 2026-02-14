/**
 * useKnowledgeBankContext Hook — Builds formatted context from enabled KB entries
 * Used by AI hooks to inject workspace Knowledge Bank into prompts
 */
import { useCallback } from 'react';
import { useKnowledgeBankStore } from '@/features/knowledgeBank/stores/knowledgeBankStore';
import { KB_MAX_CONTEXT_TOKENS } from '@/features/knowledgeBank/types/knowledgeBank';

/** Approximate tokens from character count (1 token ≈ 4 chars) */
const CHARS_PER_TOKEN = 4;

/**
 * Builds a formatted Knowledge Bank context block for AI prompt injection.
 * Truncates to stay within token budget.
 */
export function buildKBContextBlock(entries: Array<{ title: string; content: string }>): string {
    if (entries.length === 0) return '';

    const maxChars = KB_MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;
    let budget = maxChars;
    const parts: string[] = [];

    for (const entry of entries) {
        const block = `[Knowledge: ${entry.title}]\n${entry.content}`;
        if (budget - block.length < 0) break;
        parts.push(block);
        budget -= block.length;
    }

    if (parts.length === 0) return '';

    return `--- Workspace Knowledge Bank ---\n${parts.join('\n\n')}\n--- End Knowledge Bank ---`;
}

/**
 * Hook that provides the current workspace KB context string
 */
export function useKnowledgeBankContext() {
    const getEnabledEntries = useKnowledgeBankStore((s) => s.getEnabledEntries);

    const getKBContext = useCallback((): string => {
        const entries = getEnabledEntries();
        return buildKBContextBlock(entries);
    }, [getEnabledEntries]);

    return { getKBContext };
}
