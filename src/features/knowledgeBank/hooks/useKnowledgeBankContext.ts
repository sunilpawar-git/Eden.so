/**
 * useKnowledgeBankContext Hook — Builds formatted context from enabled KB entries
 * Used by AI hooks to inject workspace Knowledge Bank into prompts
 * Ranks entries by relevance to the user prompt (lightweight RAG)
 * Prefers summaries over full content for efficient token usage
 */
import { useCallback } from 'react';
import { useKnowledgeBankStore } from '@/features/knowledgeBank/stores/knowledgeBankStore';
import { KB_MAX_CONTEXT_TOKENS } from '@/features/knowledgeBank/types/knowledgeBank';
import { rankEntries } from '@/features/knowledgeBank/services/relevanceScorer';

/** Approximate tokens from character count (1 token ≈ 4 chars) */
const CHARS_PER_TOKEN = 4;

/** Entry shape accepted by the context builder */
interface ContextEntry {
    title: string;
    content: string;
    summary?: string;
    tags?: readonly string[];
}

/**
 * Builds a formatted Knowledge Bank context block for AI prompt injection.
 * When a prompt is provided, entries are ranked by relevance (lightweight RAG).
 * Uses summaries when available (more token-efficient), falls back to content.
 * Truncates to stay within token budget.
 */
export function buildKBContextBlock(
    entries: ContextEntry[],
    prompt?: string
): string {
    if (entries.length === 0) return '';

    const ranked = prompt ? rankEntries(entries, prompt) : entries;

    const maxChars = KB_MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;
    let budget = maxChars;
    const parts: string[] = [];

    for (const entry of ranked) {
        const text = entry.summary ?? entry.content;
        const block = `[Knowledge: ${entry.title}]\n${text}`;
        if (budget - block.length < 0) break;
        parts.push(block);
        budget -= block.length;
    }

    if (parts.length === 0) return '';

    return `--- Workspace Knowledge Bank ---\n${parts.join('\n\n')}\n--- End Knowledge Bank ---`;
}

/**
 * Hook that provides the current workspace KB context string.
 * Accepts an optional prompt to rank entries by relevance.
 */
export function useKnowledgeBankContext() {
    const getEnabledEntries = useKnowledgeBankStore((s) => s.getEnabledEntries);

    const getKBContext = useCallback((prompt?: string): string => {
        const entries = getEnabledEntries();
        return buildKBContextBlock(entries, prompt);
    }, [getEnabledEntries]);

    return { getKBContext };
}
