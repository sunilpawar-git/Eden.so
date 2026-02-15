/**
 * Knowledge Bank Types — Data model for workspace-level context
 * SSOT for all KB-related interfaces and constants
 */

/** Supported entry types in the Knowledge Bank */
export type KnowledgeBankEntryType = 'text' | 'image' | 'document';

/** Single entry in a workspace's Knowledge Bank */
export interface KnowledgeBankEntry {
    id: string;
    workspaceId: string;
    type: KnowledgeBankEntryType;
    title: string;
    content: string;             // Processed text (for images: AI description)
    summary?: string;            // AI-generated summary (for long entries)
    tags?: string[];             // User-defined tags for organization
    originalFileName?: string;
    storageUrl?: string;         // Firebase Storage URL (images only)
    mimeType?: string;
    parentEntryId?: string;      // Links chunks to parent document entry
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/** Shape of a new entry before persistence (no id/dates) */
export interface KnowledgeBankEntryInput {
    type: KnowledgeBankEntryType;
    title: string;
    content: string;
    tags?: string[];
    originalFileName?: string;
    storageUrl?: string;
    mimeType?: string;
    parentEntryId?: string;
}

/** Filter option for searching KB entries */
export type KBTypeFilter = KnowledgeBankEntryType | 'all';

/** Per-entry summarization result */
export type SummaryEntryResult = 'success' | 'failed' | 'skipped';

/** Zustand store state */
export interface KnowledgeBankState {
    entries: KnowledgeBankEntry[];
    isPanelOpen: boolean;
    searchQuery: string;
    typeFilter: KBTypeFilter;
    selectedTag: string | null;
    /** IDs of entries currently being summarized */
    summarizingEntryIds: string[];
}

/** Zustand store actions */
export interface KnowledgeBankActions {
    setEntries: (entries: KnowledgeBankEntry[]) => void;
    addEntry: (entry: KnowledgeBankEntry) => void;
    updateEntry: (entryId: string, updates: Partial<KnowledgeBankEntry>) => void;
    removeEntry: (entryId: string) => void;
    toggleEntry: (entryId: string) => void;
    clearEntries: () => void;
    setPanelOpen: (isOpen: boolean) => void;
    setSearchQuery: (query: string) => void;
    setTypeFilter: (filter: KBTypeFilter) => void;
    setSelectedTag: (tag: string | null) => void;
    setSummarizingEntryIds: (ids: string[]) => void;
    removeSummarizingEntryId: (id: string) => void;
    getEnabledEntries: () => KnowledgeBankEntry[];
    getFilteredEntries: () => KnowledgeBankEntry[];
    getAllTags: () => string[];
    getEntryCount: () => number;
}

// ── Constants ──────────────────────────────────────────

export const KB_MAX_ENTRIES = 50;
export const KB_MAX_CONTENT_SIZE = 10_000;        // 10KB text per entry
export const KB_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
export const KB_MAX_IMAGE_DIMENSION = 1024;        // px — longest side
export const KB_IMAGE_QUALITY = 0.7;               // JPEG compression
export const KB_MAX_CONTEXT_TOKENS = 8000;         // Token budget for AI
export const KB_CHUNK_THRESHOLD = 8_000;           // Chars before auto-chunking
export const KB_SUMMARY_THRESHOLD = 500;           // Chars before auto-summarization
export const KB_MAX_TITLE_LENGTH = 100;             // Max chars per title
export const KB_PREVIEW_LENGTH = 120;              // Content preview truncation
export const KB_MAX_TAGS_PER_ENTRY = 5;            // Max tags per entry
export const KB_MAX_TAG_LENGTH = 30;               // Max chars per tag

export const KB_ACCEPTED_MIME_TYPES = [
    'text/plain', 'text/markdown', 'application/json',
    'image/png', 'image/jpeg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
