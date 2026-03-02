/**
 * Document Relevance Scorer — Scores document groups against a prompt
 * Multi-signal formula using title, summary, and chunk content.
 * Pure functions, no side effects.
 */
import type { DocumentGroup } from '../types/knowledgeBank';
import { tokenize, scoreEntry } from './relevanceScorer';

const TITLE_MULTIPLIER = 3;
const SUMMARY_MULTIPLIER = 2;
const MAX_CHUNK_MULTIPLIER = 1;
const AVG_TOP3_MULTIPLIER = 0.5;
const TOP_N_CHUNKS = 3;

/** Score a document group against keyword tokens */
export function scoreDocumentGroup(
    group: DocumentGroup,
    keywords: readonly string[]
): number {
    if (keywords.length === 0) return 0;

    const titleScore = scoreEntry(
        { title: group.parent.title, content: '', tags: group.parent.tags },
        keywords
    );

    const summaryScore = group.parent.summary
        ? scoreEntry({ title: '', content: group.parent.summary }, keywords)
        : 0;

    const chunkScores = [group.parent, ...group.children].map((entry) =>
        scoreEntry({ title: '', content: entry.content }, keywords)
    );
    chunkScores.sort((a, b) => b - a);

    const maxChunk = chunkScores[0] ?? 0;
    const top3 = chunkScores.slice(0, TOP_N_CHUNKS);
    const avgTop3 = top3.length > 0
        ? top3.reduce((sum, s) => sum + s, 0) / top3.length
        : 0;

    return (
        titleScore * TITLE_MULTIPLIER +
        summaryScore * SUMMARY_MULTIPLIER +
        maxChunk * MAX_CHUNK_MULTIPLIER +
        avgTop3 * AVG_TOP3_MULTIPLIER
    );
}

/** Rank document groups by relevance to a prompt (descending) */
export function rankDocumentGroups(
    groups: readonly DocumentGroup[],
    prompt?: string
): DocumentGroup[] {
    if (!prompt) return [...groups];

    const keywords = tokenize(prompt);
    if (keywords.length === 0) return [...groups];

    const scored = groups.map((group, index) => ({
        group,
        score: scoreDocumentGroup(group, keywords),
        index,
    }));

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
    });

    return scored.map((s) => s.group);
}
