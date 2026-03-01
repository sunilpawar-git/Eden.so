/**
 * Hierarchical Context Builder — Orchestrates 4-level KB context injection
 * Groups entries, scores documents, applies dynamic budget, assembles context.
 * Falls back to flat format for standalone-only entries.
 */
import type { KnowledgeBankEntry, KBGenerationType } from '../types/knowledgeBank';
import { KB_TOKEN_BUDGETS, KB_MAX_CONTEXT_TOKENS, KB_CHARS_PER_TOKEN } from '../types/knowledgeBank';
import { groupEntriesByDocument } from './documentGrouper';
import { rankDocumentGroups } from './documentRelevanceScorer';
import { rankEntries } from './relevanceScorer';
import { buildCatalog, buildDocSummaries, buildChapterSummaries, buildRawContent } from './contextLevelBuilders';
import { strings } from '@/shared/localization/strings';

interface BudgetTier {
    catalog: number;
    docSummaries: number;
    chapterSummaries: number;
    rawContent: number;
}

const BUDGET_TIERS: Record<'deep' | 'balanced' | 'broad', BudgetTier> = {
    deep:     { catalog: 0.02, docSummaries: 0.15, chapterSummaries: 0.33, rawContent: 0.50 },
    balanced: { catalog: 0.05, docSummaries: 0.25, chapterSummaries: 0.35, rawContent: 0.35 },
    broad:    { catalog: 0.08, docSummaries: 0.35, chapterSummaries: 0.35, rawContent: 0.22 },
};

function wrapperStart() { return strings.knowledgeBank.ai.kbWrapperStart; }
function wrapperEnd() { return strings.knowledgeBank.ai.kbWrapperEnd; }

function selectTier(docCount: number): BudgetTier {
    if (docCount <= 2) return BUDGET_TIERS.deep;
    if (docCount <= 5) return BUDGET_TIERS.balanced;
    return BUDGET_TIERS.broad;
}

function resolveMaxChars(generationType?: KBGenerationType): number {
    const tokens = generationType ? KB_TOKEN_BUDGETS[generationType] : KB_MAX_CONTEXT_TOKENS;
    return tokens * KB_CHARS_PER_TOKEN;
}

/** Build flat context for standalone-only entries (backward-compatible format) */
function buildFlatContext(
    entries: readonly KnowledgeBankEntry[],
    prompt: string | undefined,
    maxChars: number
): string {
    const pinned = entries.filter((e) => e.pinned === true);
    const unpinned = entries.filter((e) => e.pinned !== true);
    const ranked = prompt ? rankEntries(unpinned, prompt) : [...unpinned];
    const ordered = [...pinned, ...ranked];

    let budget = maxChars;
    const parts: string[] = [];
    for (const entry of ordered) {
        const text = entry.summary ?? entry.content;
        const block = `[Knowledge: ${entry.title}]\n${text}`;
        if (budget - block.length < 0) break;
        parts.push(block);
        budget -= block.length;
    }
    return parts.join('\n\n');
}

/**
 * Build hierarchical KB context from entries.
 * Groups entries by document, scores groups, applies dynamic budget tiers,
 * and assembles a 4-level context string.
 */
export function buildHierarchicalKBContext(
    entries: readonly KnowledgeBankEntry[],
    prompt?: string,
    generationType?: KBGenerationType
): string {
    if (entries.length === 0) return '';

    const maxChars = resolveMaxChars(generationType);
    const { standalone, documents } = groupEntriesByDocument(entries);

    if (documents.length === 0) {
        const body = buildFlatContext(standalone, prompt, maxChars);
        if (!body) return '';
        return `${wrapperStart()}\n${body}\n${wrapperEnd()}`;
    }

    const rankedDocs = rankDocumentGroups(documents, prompt);
    const tier = selectTier(rankedDocs.length);
    const sections: string[] = [];

    const ai = strings.knowledgeBank.ai;

    const catalogBudget = Math.floor(maxChars * tier.catalog);
    const catalog = buildCatalog(rankedDocs, catalogBudget);
    if (catalog) sections.push(`${ai.catalogHeader}\n${catalog}`);

    const summaryBudget = Math.floor(maxChars * tier.docSummaries);
    const docSums = buildDocSummaries(rankedDocs, summaryBudget);
    if (docSums) sections.push(`${ai.docSummariesHeader}\n${docSums}`);

    const chapterBudget = Math.floor(maxChars * tier.chapterSummaries);
    const chapters = buildChapterSummaries(rankedDocs, chapterBudget);
    if (chapters) sections.push(`${ai.chapterSummariesHeader}\n${chapters}`);

    const rawBudget = Math.floor(maxChars * tier.rawContent);
    const raw = buildRawContent(rankedDocs, rawBudget);
    if (raw) sections.push(`${ai.rawContentHeader}\n${raw}`);

    if (standalone.length > 0) {
        const remainingBudget = maxChars - sections.join('\n\n').length;
        if (remainingBudget > 100) {
            const flat = buildFlatContext(standalone, prompt, remainingBudget);
            if (flat) sections.push(flat);
        }
    }

    if (sections.length === 0) return '';
    return `${wrapperStart()}\n${sections.join('\n\n')}\n${wrapperEnd()}`;
}
