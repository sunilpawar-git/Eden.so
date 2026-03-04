/**
 * Entity Index Types — in-memory index for cross-document intelligence.
 * Built from ExtractionResult cached on AttachmentMeta.
 */
import type { DocumentClassification, ExtractionResult } from './documentAgent';

export interface EntityIndexEntry {
    nodeId: string;
    filename: string;
    classification: DocumentClassification;
    entities: string[];
    summary: string;
    analyzedAt: number;
}

export interface EntityIndex {
    entries: EntityIndexEntry[];
    idfMap: Map<string, number>;
    lastBuilt: number;
}

export interface CrossReferenceMatch {
    entry: EntityIndexEntry;
    score: number;
    overlappingEntities: string[];
}

export interface CrossReferenceResult {
    connections: string[];
    contradictions: string[];
    actionItems: string[];
    relatedDocuments: string[];
}

export const CROSS_REF_SCORE_THRESHOLD = 0.1;
export const CROSS_REF_MAX_MATCHES = 5;
export const ENTITY_MAX_LENGTH = 200;
export const INDEX_STALE_MS = 5 * 60 * 1000;

/** Extract flat entity list from an ExtractionResult */
export function extractEntities(result: ExtractionResult): string[] {
    return [
        ...result.keyFacts,
        ...result.extendedFacts,
        ...result.actionItems,
    ].map((e) => e.slice(0, ENTITY_MAX_LENGTH));
}
