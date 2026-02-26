/**
 * useKnowledgeBankContext Hook — Builds formatted context from enabled KB entries
 * Used by AI hooks to inject workspace Knowledge Bank into prompts
 * Ranks entries by relevance to the user prompt (lightweight RAG)
 * Prefers summaries over full content for efficient token usage
 */
import { useCallback } from 'react';
import { useKnowledgeBankStore } from '@/features/knowledgeBank/stores/knowledgeBankStore';
import {
    KB_MAX_CONTEXT_TOKENS, KB_TOKEN_BUDGETS, KB_CHARS_PER_TOKEN,
    type KBGenerationType,
} from '@/features/knowledgeBank/types/knowledgeBank';
import { rankEntries } from '@/features/knowledgeBank/services/relevanceScorer';

/** Entry shape accepted by the context builder */
interface ContextEntry {
    title: string;
    content: string;
    summary?: string;
    tags?: readonly string[];
    pinned?: boolean;
}

/** Resolve token budget from generation type, falling back to default */
function resolveTokenBudget(generationType?: KBGenerationType): number {
    return generationType ? KB_TOKEN_BUDGETS[generationType] : KB_MAX_CONTEXT_TOKENS;
}

/**
 * Builds a formatted Knowledge Bank context block for AI prompt injection.
 * When a prompt is provided, entries are ranked by relevance (lightweight RAG).
 * Uses summaries when available (more token-efficient), falls back to content.
 * Token budget varies by generation type (single/chain/transform).
 *
 * Note: Each entry has ~KB_CONTEXT_ENTRY_OVERHEAD chars of wrapper overhead
 * ("[Knowledge: title]\n") that is included in the budget calculation naturally
 * via block.length, but is not separately budgeted. This is intentional — the
 * overhead provides a small safety margin against token estimation drift.
 */
export function buildKBContextBlock(
    entries: ContextEntry[],
    prompt?: string,
    generationType?: KBGenerationType
): string {
    if (entries.length === 0) return '';

    // Separate pinned from unpinned; rank unpinned by relevance
    const pinned = entries.filter((e) => e.pinned === true);
    const unpinned = entries.filter((e) => e.pinned !== true);
    const rankedUnpinned = prompt ? rankEntries(unpinned, prompt) : unpinned;
    const ordered = [...pinned, ...rankedUnpinned];

    const maxChars = resolveTokenBudget(generationType) * KB_CHARS_PER_TOKEN;
    let budget = maxChars;
    const parts: string[] = [];

    for (const entry of ordered) {
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
    const getKBContext = useCallback((prompt?: string, generationType?: KBGenerationType): string => {
        const entries = useKnowledgeBankStore.getState().getEnabledEntries();
        return buildKBContextBlock(entries, prompt, generationType);
    }, []);

    return { getKBContext };
}
