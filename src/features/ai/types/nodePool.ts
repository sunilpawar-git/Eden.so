/**
 * Node Pool Types — Data model for Canvas Memory (AI context from user nodes)
 * SSOT for all node pool interfaces and constants
 */

/** Shape of a node entry prepared for AI context ranking */
export interface NodePoolEntry {
    id: string;
    title: string;
    content: string;
    tags: string[];
}

/** AI generation types that determine node pool token budget */
export type NodePoolGenerationType = 'single' | 'chain' | 'transform';

/**
 * Token budgets per generation type — matches KB budgets because
 * starred nodes represent explicit user intent and deserve full budget.
 */
export const NODE_POOL_TOKEN_BUDGETS: Record<NodePoolGenerationType, number> = {
    single: 12_000,
    chain: 6_000,
    transform: 3_000,
} as const;

/** Approx chars per token (matches KB_CHARS_PER_TOKEN for consistency) */
export const NODE_POOL_CHARS_PER_TOKEN = 4;
