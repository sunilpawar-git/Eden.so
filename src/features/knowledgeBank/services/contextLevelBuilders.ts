/**
 * Context Level Builders — Pure functions for each hierarchy level
 * Level 1: Catalog (title + section count per doc)
 * Level 2: Document summaries (whole-doc summary from Phase 2)
 * Level 3: Chapter summaries (individual chunk summaries)
 * Level 4: Raw content (actual chunk text)
 */
import type { DocumentGroup } from '../types/knowledgeBank';

/** Level 1: Compact catalog of all documents */
export function buildCatalog(groups: readonly DocumentGroup[], budget: number): string {
    if (groups.length === 0) return '';
    const lines: string[] = [];
    let used = 0;

    for (const group of groups) {
        const line = `[Doc: ${group.parent.title} - ${group.totalParts} sections]`;
        if (used + line.length > budget) break;
        lines.push(line);
        used += line.length;
    }
    return lines.join('\n');
}

/** Level 2: Document-level summaries for ranked groups */
export function buildDocSummaries(groups: readonly DocumentGroup[], budget: number): string {
    const parts: string[] = [];
    let used = 0;

    for (const group of groups) {
        if (!group.parent.summary) continue;
        const block = `[${group.parent.title}]\n${group.parent.summary}`;
        if (used + block.length > budget) break;
        parts.push(block);
        used += block.length;
    }
    return parts.join('\n\n');
}

/** Level 3: Individual chunk summaries from top groups */
export function buildChapterSummaries(groups: readonly DocumentGroup[], budget: number): string {
    const parts: string[] = [];
    let used = 0;

    for (const group of groups) {
        const allEntries = [group.parent, ...group.children];
        for (const entry of allEntries) {
            const text = entry.summary;
            if (!text) continue;
            const block = `[${entry.title}]\n${text}`;
            if (used + block.length > budget) return parts.join('\n\n');
            parts.push(block);
            used += block.length;
        }
    }
    return parts.join('\n\n');
}

/** Level 4: Raw chunk content from top groups */
export function buildRawContent(groups: readonly DocumentGroup[], budget: number): string {
    const parts: string[] = [];
    let used = 0;

    for (const group of groups) {
        const allEntries = [group.parent, ...group.children];
        for (const entry of allEntries) {
            const block = `[${entry.title}]\n${entry.content}`;
            if (used + block.length > budget) return parts.join('\n\n');
            parts.push(block);
            used += block.length;
        }
    }
    return parts.join('\n\n');
}
