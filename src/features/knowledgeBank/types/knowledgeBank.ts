/**
 * Knowledge Bank Types — Data model for workspace-level context
 * SSOT for all KB-related interfaces and constants
 */

/** Supported entry types in the Knowledge Bank */
export type KnowledgeBankEntryType = 'text' | 'image';

/** Single entry in a workspace's Knowledge Bank */
export interface KnowledgeBankEntry {
    id: string;
    workspaceId: string;
    type: KnowledgeBankEntryType;
    title: string;
    content: string;             // Processed text (for images: AI description)
    originalFileName?: string;
    storageUrl?: string;         // Firebase Storage URL (images only)
    mimeType?: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/** Shape of a new entry before persistence (no id/dates) */
export interface KnowledgeBankEntryInput {
    type: KnowledgeBankEntryType;
    title: string;
    content: string;
    originalFileName?: string;
    storageUrl?: string;
    mimeType?: string;
}

/** Zustand store state */
export interface KnowledgeBankState {
    entries: KnowledgeBankEntry[];
    isPanelOpen: boolean;
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
    getEnabledEntries: () => KnowledgeBankEntry[];
    getEntryCount: () => number;
}

// ── Constants ──────────────────────────────────────────

export const KB_MAX_ENTRIES = 20;
export const KB_MAX_CONTENT_SIZE = 10_000;       // 10KB text per entry
export const KB_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
export const KB_MAX_IMAGE_DIMENSION = 1024;       // px — longest side
export const KB_IMAGE_QUALITY = 0.7;              // JPEG compression
export const KB_MAX_CONTEXT_TOKENS = 3000;        // Token budget for AI

export const KB_ACCEPTED_TEXT_TYPES = ['.txt', '.md', '.json'] as const;
export const KB_ACCEPTED_IMAGE_TYPES = ['.png', '.jpg', '.jpeg'] as const;
export const KB_ACCEPTED_MIME_TYPES = [
    'text/plain', 'text/markdown', 'application/json',
    'image/png', 'image/jpeg',
] as const;

