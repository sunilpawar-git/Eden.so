/**
 * Chunking Service — Splits large documents into logical sections
 * Pure functions, no side effects (fully testable)
 */
import { KB_CHUNK_THRESHOLD } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';

/** Single chunk result with title, content, and index */
export interface ChunkResult {
    title: string;
    content: string;
    index: number;
}

/**
 * Split document content into chunks if it exceeds the threshold.
 * Returns empty array if content fits in a single entry.
 * Prefers splitting at paragraph boundaries, then sentence boundaries.
 */
export function chunkDocument(content: string, docTitle: string): ChunkResult[] {
    if (content.length <= KB_CHUNK_THRESHOLD) return [];

    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
        if (remaining.length <= KB_CHUNK_THRESHOLD) {
            chunks.push(remaining);
            break;
        }
        const splitPoint = findSplitPoint(remaining, KB_CHUNK_THRESHOLD);
        chunks.push(remaining.slice(0, splitPoint));
        remaining = remaining.slice(splitPoint);
    }

    const partLabel = strings.knowledgeBank.documentChunkTitle;
    return chunks.map((text, i) => ({
        title: `${docTitle} — ${partLabel} ${i + 1}`,
        content: text.trim(),
        index: i,
    }));
}

/**
 * Find the best split point within maxLen characters.
 * Priority: paragraph break (\n\n) > sentence end (. ) > hard cut.
 */
function findSplitPoint(text: string, maxLen: number): number {
    const searchRegion = text.slice(0, maxLen);

    // Try paragraph boundary (last \n\n within range)
    const paraIdx = searchRegion.lastIndexOf('\n\n');
    if (paraIdx > maxLen * 0.3) return paraIdx + 2;

    // Try sentence boundary (last ". " within range)
    const sentenceIdx = searchRegion.lastIndexOf('. ');
    if (sentenceIdx > maxLen * 0.3) return sentenceIdx + 2;

    // Hard cut at maxLen as last resort
    return maxLen;
}
