/**
 * NodePoolBuilder — Pure functions for building AI context from pooled nodes
 * Filters pooled nodes, converts to entries, ranks by relevance, formats context.
 * No side effects, no store access, no API calls.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { Workspace } from '@/features/workspace/types/workspace';
import type { NodePoolEntry, NodePoolGenerationType } from '../types/nodePool';
import { NODE_POOL_TOKEN_BUDGETS, NODE_POOL_CHARS_PER_TOKEN } from '../types/nodePool';
import { nodePoolStrings } from '@/shared/localization/nodePoolStrings';
import { NodePoolCache } from './nodePoolCache';
import { attachmentTextCache } from './attachmentTextCache';
import { tokenize, scoreEntry } from '@/features/knowledgeBank/services/relevanceScorer';

const sharedCache = new NodePoolCache();

/** Cap for entries before expensive TF-IDF ranking. Pre-filter by keyword score. */
const MAX_ENTRIES_FOR_RANKING = 100;

/**
 * Filter canvas nodes to those included in the AI Memory pool.
 * When workspace.includeAllNodesInPool is true, all nodes qualify.
 * Otherwise only individually starred nodes are included.
 * Nodes in excludeNodeIds are always filtered out (upstream chain + self).
 */
export function getPooledNodes(
    nodes: readonly CanvasNode[],
    workspace: Workspace | null,
    excludeNodeIds: ReadonlySet<string>
): CanvasNode[] {
    const useAll = workspace?.includeAllNodesInPool === true;

    return nodes.filter((n) => {
        if (excludeNodeIds.has(n.id)) return false;
        return useAll || n.data.includeInAIPool === true;
    });
}

/** Convert a CanvasNode into a NodePoolEntry for ranking and context */
export function nodeToPoolEntry(node: CanvasNode): NodePoolEntry {
    const heading = node.data.heading?.trim() ?? '';
    const output = node.data.output?.trim() ?? '';
    const title = heading.length > 0 ? heading : nodePoolStrings.untitled;

    let content: string;
    if (output && heading) {
        content = `${heading}\n\n${output}`;
    } else {
        content = output.length > 0 ? output : heading;
    }

    const tags: string[] = Array.isArray(node.data.tags) ? node.data.tags : [];

    return { id: node.id, title, content, tags };
}

/**
 * Enrich a NodePoolEntry with pre-fetched attachment text.
 * Attachment text is appended to content so TF-IDF ranking naturally
 * includes document knowledge. Uses the LRU cache to avoid re-fetching.
 */
export async function enrichEntryWithAttachments(
    node: CanvasNode,
    entry: NodePoolEntry,
): Promise<NodePoolEntry> {
    const attachments = node.data.attachments;
    if (!attachments || attachments.length === 0) return entry;

    const textParts = await Promise.all(
        attachments
            .filter((att): att is typeof att & { parsedTextUrl: string } => Boolean(att.parsedTextUrl))
            .map((att) => attachmentTextCache.getText(att.parsedTextUrl))
    );

    const attachmentText = textParts.filter(Boolean).join('\n\n');
    if (!attachmentText) return entry;

    return {
        ...entry,
        content: entry.content
            ? `${entry.content}\n\n[Attachment]\n${attachmentText}`
            : `[Attachment]\n${attachmentText}`,
    };
}

/**
 * Build pool entries for all pooled nodes, enriching with attachment text.
 * Async because attachment text may need to be fetched from Storage.
 */
export async function buildPoolEntriesWithAttachments(
    nodes: CanvasNode[],
): Promise<NodePoolEntry[]> {
    return Promise.all(nodes.map((node) => enrichEntryWithAttachments(node, nodeToPoolEntry(node))));
}

/**
 * Format ranked pool entries into a context string within the token budget.
 * Pure function — no async, no side effects.
 */
function formatPoolContext(
    ranked: readonly NodePoolEntry[],
    generationType: NodePoolGenerationType,
): string {
    const maxChars = NODE_POOL_TOKEN_BUDGETS[generationType] * NODE_POOL_CHARS_PER_TOKEN;
    let budget = maxChars;
    const parts: string[] = [];

    for (const entry of ranked) {
        const block = `[Memory: ${entry.title}]\n${entry.content}`;
        if (budget - block.length < 0) break;
        parts.push(block);
        budget -= block.length;
    }

    if (parts.length === 0) return '';
    return `${nodePoolStrings.contextHeader}\n${parts.join('\n\n')}\n${nodePoolStrings.contextFooter}`;
}

/**
 * Build the full node pool context string for AI prompt injection.
 * 1. Filters pooled nodes (excluding self + upstream chain)
 * 2. Converts to entries (with cached attachment text appended)
 * 3. Ranks by relevance using memoized TF-IDF corpus
 * 4. Formats within token budget
 * Returns empty string if no pooled nodes qualify.
 */
export async function buildNodePoolContext(
    nodes: readonly CanvasNode[],
    workspace: Workspace | null,
    prompt: string,
    generationType: NodePoolGenerationType,
    excludeNodeIds: ReadonlySet<string>
): Promise<string> {
    const pooled = getPooledNodes(nodes, workspace, excludeNodeIds);
    if (pooled.length === 0) return '';

    let entries = await buildPoolEntriesWithAttachments(pooled);

    if (entries.length > MAX_ENTRIES_FOR_RANKING) {
        const keywords = tokenize(prompt);
        if (keywords.length > 0) {
            const scored = entries.map((e, i) => ({ e, s: scoreEntry(e, keywords), i }));
            scored.sort((a, b) => b.s !== a.s ? b.s - a.s : a.i - b.i);
            entries = scored.slice(0, MAX_ENTRIES_FOR_RANKING).map((x) => x.e);
        } else {
            entries = entries.slice(0, MAX_ENTRIES_FOR_RANKING);
        }
    }

    const ranked = sharedCache.rankEntries(entries, prompt);
    return formatPoolContext(ranked, generationType);
}
