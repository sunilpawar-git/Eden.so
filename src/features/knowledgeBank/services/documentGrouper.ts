/**
 * Document Grouper — Pure function to group KB entries by document relationship
 * Two-pass algorithm: build parent map, then assign children
 */
import type { KnowledgeBankEntry, GroupedEntries, DocumentGroup } from '../types/knowledgeBank';

const PART_SUFFIX_RE = /\s*-\s*Part\s+\d+$/i;

/** Strip " - Part 1" / " - Part 01" suffix for display */
export function getDisplayTitle(entry: KnowledgeBankEntry): string {
    return entry.title.replace(PART_SUFFIX_RE, '');
}

/** Group entries into standalone entries and document groups (parent + children) */
export function groupEntriesByDocument(entries: readonly KnowledgeBankEntry[]): GroupedEntries {
    const childrenMap = new Map<string, KnowledgeBankEntry[]>();
    const parentMap = new Map<string, KnowledgeBankEntry>();
    const nonChildren: KnowledgeBankEntry[] = [];

    // Pass 1: separate children from non-children, index parents by id
    for (const entry of entries) {
        if (entry.parentEntryId) {
            const siblings = childrenMap.get(entry.parentEntryId) ?? [];
            siblings.push(entry);
            childrenMap.set(entry.parentEntryId, siblings);
        } else {
            nonChildren.push(entry);
            parentMap.set(entry.id, entry);
        }
    }

    // Pass 2: pair parents with children; solo parents become standalone
    const standalone: KnowledgeBankEntry[] = [];
    const documents: DocumentGroup[] = [];

    for (const entry of nonChildren) {
        const children = childrenMap.get(entry.id);
        if (children && children.length > 0) {
            documents.push({ parent: entry, children, totalParts: 1 + children.length });
        } else {
            standalone.push(entry);
        }
    }

    // Orphaned children (parent not in entries) become standalone
    for (const [parentId, orphans] of childrenMap) {
        if (!parentMap.has(parentId)) {
            standalone.push(...orphans);
        }
    }

    return { standalone, documents };
}
