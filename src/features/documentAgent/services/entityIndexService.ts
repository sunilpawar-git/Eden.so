/**
 * Entity Index Service — builds and queries the in-memory entity index
 * for cross-document intelligence. Uses existing TF-IDF infrastructure.
 * Pure functions, no side effects, no store dependencies.
 */
import { tokenizeRaw } from '@/features/knowledgeBank/services/relevanceScorer';
import { buildCorpusIDF, tfidfScore } from '@/features/knowledgeBank/services/tfidfScorer';
import { extractEntities, CROSS_REF_MAX_MATCHES, CROSS_REF_SCORE_THRESHOLD } from '../types/entityIndex';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { EntityIndex, EntityIndexEntry, CrossReferenceMatch } from '../types/entityIndex';

/** Extract an EntityIndexEntry from a node with cached extraction */
function nodeToEntry(node: CanvasNode): EntityIndexEntry | null {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- guardrail #14 requires optional chaining on node.data
    const attachment = node.data?.attachments?.find((a) => a.extraction && a.analyzedAt);
    if (!attachment?.extraction || !attachment.analyzedAt) return null;

    return {
        nodeId: node.id,
        filename: attachment.filename,
        classification: attachment.extraction.classification,
        entities: extractEntities(attachment.extraction),
        summary: attachment.extraction.summary,
        analyzedAt: attachment.analyzedAt,
    };
}

/** Tokenize all entities in an entry into a flat token array */
function tokenizeEntities(entities: string[]): string[] {
    return entities.flatMap((e) => tokenizeRaw(e));
}

/** Build corpus IDF from index entries */
function rebuildIDF(entries: EntityIndexEntry[]): Map<string, number> {
    const corpus = entries.map((e) => tokenizeEntities(e.entities));
    return buildCorpusIDF(corpus);
}

/**
 * Build entity index from all nodes in the workspace.
 * Scans for nodes with cached ExtractionResult on their attachments.
 */
export function buildEntityIndex(nodes: CanvasNode[]): EntityIndex {
    const entries: EntityIndexEntry[] = [];

    for (const node of nodes) {
        const entry = nodeToEntry(node);
        if (entry && entry.entities.length > 0) {
            entries.push(entry);
        }
    }

    return {
        entries,
        idfMap: rebuildIDF(entries),
        lastBuilt: Date.now(),
    };
}

/**
 * Query the entity index for cross-references to the given entities.
 * Excludes the querying node. Returns top matches above score threshold.
 */
export function queryEntityIndex(
    index: EntityIndex,
    queryEntities: string[],
    excludeNodeId: string,
): CrossReferenceMatch[] {
    const queryTokens = tokenizeEntities(queryEntities);
    if (queryTokens.length === 0) return [];

    const matches: CrossReferenceMatch[] = [];

    for (const entry of index.entries) {
        if (entry.nodeId === excludeNodeId) continue;

        const docTokens = tokenizeEntities(entry.entities);
        const score = tfidfScore(docTokens, queryTokens, index.idfMap);
        if (score < CROSS_REF_SCORE_THRESHOLD) continue;

        const querySet = new Set(queryTokens);
        const overlapping = entry.entities.filter((e) =>
            tokenizeRaw(e).some((t) => querySet.has(t)),
        );

        matches.push({ entry, score, overlappingEntities: overlapping });
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, CROSS_REF_MAX_MATCHES);
}

/**
 * Add or replace an entry in the index. Rebuilds IDF map.
 * Returns a new EntityIndex (immutable pattern).
 */
export function addEntryToIndex(index: EntityIndex, entry: EntityIndexEntry): EntityIndex {
    const entries = index.entries.filter((e) => e.nodeId !== entry.nodeId);
    entries.push(entry);

    return {
        entries,
        idfMap: rebuildIDF(entries),
        lastBuilt: Date.now(),
    };
}
