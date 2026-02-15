# Knowledge Bank — Detailed Implementation Plan

> **Branch**: `feature/knowbank` (from `main`)
> **Feature**: Workspace-level context system for AI-driven idea generation
> **Status**: Ready for peer review

---

## Context

Eden.so currently has **node-to-node AI context** (via edges) but **no workspace-level shared knowledge**. Users must repeat context (guest list, theme, budget) in every node prompt. The Knowledge Bank solves this by letting users upload text/images **once** per workspace, which then automatically injects into every AI operation (generation + transform).

---

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Image processing | Auto-describe via Gemini Vision on upload, **compress first** |
| Entry limit | 20 entries per workspace, 10KB text each |
| Panel UI | Slide-out from left edge (non-blocking) |
| Text input | Simple textarea (not TipTap) |
| Branch strategy | `feature/knowbank` with build gate per phase |
| Tech debt | Audit + resolve at end of each phase, zero carryover |

---

## Cross-Cutting Standards (All Phases)

| Standard | Enforcement |
|----------|-------------|
| File Size | MAX 300 lines — split immediately |
| Component | MAX 100 lines — extract sub-components |
| Hook | MAX 75 lines — split by responsibility |
| Function | MAX 50 lines — extract helpers |
| MVVM | types → stores → hooks → components |
| SOLID | Single responsibility, open/closed, interface segregation |
| SSOT | One source of truth per data domain |
| String Resources | ALL UI text via `strings.ts` — zero hardcoded strings |
| CSS Variables | ALL colors/dimensions via `variables.css` — zero hardcoded values |
| TDD | RED → GREEN → REFACTOR for every feature |
| Security | No secrets in code, input sanitization, XSS prevention |
| Build Gate | `npm run lint && npm run test && npm run build` after EVERY phase |
| Tech Debt | Report + resolve at end of each phase — zero carryover |

---

## Existing Code References

### Files to Modify
| File | Current Lines | Role |
|------|--------------|------|
| `src/shared/components/Layout.tsx` | 50 | Top toolbar — add KB button left of SearchBar |
| `src/features/ai/hooks/useNodeGeneration.ts` | 127 | AI generation — inject KB context |
| `src/features/ai/hooks/useNodeTransformation.ts` | 50 | AI transform — inject KB context |
| `src/features/ai/services/geminiService.ts` | 252 | Gemini API — accept KB context param |
| `src/shared/localization/strings.ts` | 274 | String resources — add KB section |

### Patterns to Reuse
| Pattern | Source File | What to Reuse |
|---------|------------|---------------|
| Zustand store | `src/features/workspace/stores/workspaceStore.ts` | `create()` + state/actions split |
| Firestore CRUD | `src/features/workspace/services/workspaceService.ts` | `getSubcollectionRef()`, `writeBatch()`, `removeUndefined()` |
| Store tests | `src/features/auth/__tests__/authStore.test.ts` | `getState()`/`setState()` in `beforeEach` |
| Modal UI | `src/shared/components/UpgradePrompt.tsx` | Overlay + backdrop + content card |
| Panel UI | `src/shared/components/SettingsPanel/SettingsPanel.tsx` | Slide-out with tabs, Escape key handling |
| CSS tokens | `src/styles/variables.css` | All spacing, colors, radii, shadows |
| Firebase config | `src/config/firebase.ts` | `db` export, env var pattern |

### Firestore Structure (Current)
```
/users/{userId}/workspaces/{workspaceId}/
  ├── nodes/{nodeId}
  └── edges/{edgeId}
```

### Firestore Structure (After)
```
/users/{userId}/workspaces/{workspaceId}/
  ├── nodes/{nodeId}
  ├── edges/{edgeId}
  └── knowledgeBank/{entryId}    ← NEW
```

---

## Data Model

### `src/features/knowledgeBank/types/knowledgeBank.ts`

```typescript
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
    isLoading: boolean;
    isPanelOpen: boolean;
    error: string | null;
}

/** Zustand store actions */
export interface KnowledgeBankActions {
    setEntries: (entries: KnowledgeBankEntry[]) => void;
    addEntry: (entry: KnowledgeBankEntry) => void;
    updateEntry: (entryId: string, updates: Partial<KnowledgeBankEntry>) => void;
    removeEntry: (entryId: string) => void;
    toggleEntry: (entryId: string) => void;
    clearEntries: () => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
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

// ── Type Guards ────────────────────────────────────────

export function isTextEntry(entry: KnowledgeBankEntry): boolean {
    return entry.type === 'text';
}

export function isImageEntry(entry: KnowledgeBankEntry): boolean {
    return entry.type === 'image';
}
```

**~75 lines. Single responsibility: types + constants.**

---

## Phase 1: Core Infrastructure (Types + Service + Store + Tests)

**Goal**: Build the data foundation with TDD. No UI yet.

### Step 1.1 — Create feature branch

```bash
git checkout -b feature/knowbank main
```

### Step 1.2 — Create types file

Create `src/features/knowledgeBank/types/knowledgeBank.ts` as shown above.

### Step 1.3 — Add string resources

**File**: `src/shared/localization/strings.ts`
**Action**: Add `knowledgeBank` section after `offlineFallback` block (before closing `} as const`)

```typescript
    knowledgeBank: {
        title: 'Knowledge Bank',
        addButton: 'Add to Knowledge Bank',
        uploadFile: 'Upload File',
        pasteText: 'Paste Text',
        viewBank: 'View Knowledge Bank',
        saveEntry: 'Save to Knowledge Bank',
        editEntry: 'Edit',
        deleteEntry: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this entry? This action cannot be undone.',
        toggleEnable: 'Enable',
        toggleDisable: 'Disable',
        emptyState: 'No entries yet',
        emptyStateDescription: 'Add text or files to your Knowledge Bank. All AI-generated nodes will use this context automatically.',
        addFirstEntry: 'Add First Entry',
        maxEntriesReached: 'Limit reached',
        maxEntriesDescription: 'Delete an entry to add more',
        entryCount: 'entries',
        characterCount: 'characters',
        titlePlaceholder: 'Entry title',
        contentPlaceholder: 'Paste your text here...',
        processingImage: 'Processing image...',
        compressingImage: 'Compressing image...',
        describingImage: 'Describing image with AI...',
        errors: {
            fileTooLarge: 'File exceeds 5MB limit',
            unsupportedType: 'Unsupported file type',
            uploadFailed: 'Failed to upload file',
            saveFailed: 'Failed to save entry',
            loadFailed: 'Failed to load Knowledge Bank',
            deleteFailed: 'Failed to delete entry',
            maxEntries: 'Maximum of 20 entries reached',
            contentTooLarge: 'Content exceeds 10,000 character limit',
            titleRequired: 'Title is required',
        },
    },
```

### Step 1.4 — Create Firestore service (TDD)

**File**: `src/features/knowledgeBank/services/knowledgeBankService.ts`

```typescript
/**
 * Knowledge Bank Service — Firestore persistence
 * Handles CRUD operations for KB entries in a workspace subcollection
 */
import {
    doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { KnowledgeBankEntry, KnowledgeBankEntryInput } from '../types/knowledgeBank';
import { KB_MAX_ENTRIES, KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { sanitizeContent } from '../utils/sanitizer';

// ── Firestore Paths ────────────────────────────────────

const getKBCollectionRef = (userId: string, workspaceId: string) =>
    collection(db, 'users', userId, 'workspaces', workspaceId, 'knowledgeBank');

const getKBDocRef = (userId: string, workspaceId: string, entryId: string) =>
    doc(db, 'users', userId, 'workspaces', workspaceId, 'knowledgeBank', entryId);

// ── Validation ─────────────────────────────────────────

function validateEntry(input: KnowledgeBankEntryInput): void {
    if (!input.title.trim()) {
        throw new Error(strings.knowledgeBank.errors.titleRequired);
    }
    if (input.content.length > KB_MAX_CONTENT_SIZE) {
        throw new Error(strings.knowledgeBank.errors.contentTooLarge);
    }
}

// ── CRUD Operations ────────────────────────────────────

/** Add a new entry to the Knowledge Bank */
export async function addKBEntry(
    userId: string,
    workspaceId: string,
    input: KnowledgeBankEntryInput
): Promise<KnowledgeBankEntry> {
    validateEntry(input);

    // Check entry limit
    const existing = await loadKBEntries(userId, workspaceId);
    if (existing.length >= KB_MAX_ENTRIES) {
        throw new Error(strings.knowledgeBank.errors.maxEntries);
    }

    const entryId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const entry: KnowledgeBankEntry = {
        id: entryId,
        workspaceId,
        type: input.type,
        title: sanitizeContent(input.title.trim()),
        content: sanitizeContent(input.content),
        originalFileName: input.originalFileName,
        storageUrl: input.storageUrl,
        mimeType: input.mimeType,
        enabled: true,
        createdAt: now,
        updatedAt: now,
    };

    await setDoc(getKBDocRef(userId, workspaceId, entryId), {
        ...entry,
        updatedAt: serverTimestamp(),
    });

    return entry;
}

/** Update an existing entry */
export async function updateKBEntry(
    userId: string,
    workspaceId: string,
    entryId: string,
    updates: Partial<Pick<KnowledgeBankEntry, 'title' | 'content' | 'enabled'>>
): Promise<void> {
    if (updates.title !== undefined && !updates.title.trim()) {
        throw new Error(strings.knowledgeBank.errors.titleRequired);
    }
    if (updates.content !== undefined && updates.content.length > KB_MAX_CONTENT_SIZE) {
        throw new Error(strings.knowledgeBank.errors.contentTooLarge);
    }

    const sanitizedUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) sanitizedUpdates.title = sanitizeContent(updates.title.trim());
    if (updates.content !== undefined) sanitizedUpdates.content = sanitizeContent(updates.content);
    if (updates.enabled !== undefined) sanitizedUpdates.enabled = updates.enabled;

    await setDoc(getKBDocRef(userId, workspaceId, entryId), sanitizedUpdates, { merge: true });
}

/** Delete an entry */
export async function deleteKBEntry(
    userId: string,
    workspaceId: string,
    entryId: string
): Promise<void> {
    await deleteDoc(getKBDocRef(userId, workspaceId, entryId));
}

/** Load all entries for a workspace */
export async function loadKBEntries(
    userId: string,
    workspaceId: string
): Promise<KnowledgeBankEntry[]> {
    const snapshot = await getDocs(getKBCollectionRef(userId, workspaceId));
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Firestore DocumentData */
        return {
            id: data.id,
            workspaceId,
            type: data.type,
            title: data.title,
            content: data.content,
            originalFileName: data.originalFileName,
            storageUrl: data.storageUrl,
            mimeType: data.mimeType,
            enabled: data.enabled ?? true,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        } as KnowledgeBankEntry;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    });
}

/** Delete ALL entries for a workspace (used on workspace deletion) */
export async function deleteAllKBEntries(
    userId: string,
    workspaceId: string
): Promise<void> {
    const snapshot = await getDocs(getKBCollectionRef(userId, workspaceId));
    const deletions = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);
}
```

**~120 lines. Follows `workspaceService.ts` patterns exactly.**

### Step 1.5 — Create sanitizer utility

**File**: `src/features/knowledgeBank/utils/sanitizer.ts`

```typescript
/**
 * Content Sanitizer — XSS prevention for Knowledge Bank entries
 * Strips HTML tags and dangerous patterns from user-provided text
 */

/** Strip HTML tags to prevent XSS when rendering or injecting into AI prompts */
export function sanitizeContent(input: string): string {
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

/** Validate that content does not exceed max size */
export function isContentWithinLimit(content: string, maxSize: number): boolean {
    return content.length <= maxSize;
}
```

**~18 lines. Pure functions, 100% testable.**

### Step 1.6 — Create Zustand store (TDD)

**File**: `src/features/knowledgeBank/stores/knowledgeBankStore.ts`

```typescript
/**
 * Knowledge Bank Store — ViewModel for KB state
 * Manages entries, loading state, and panel visibility
 */
import { create } from 'zustand';
import type {
    KnowledgeBankEntry,
    KnowledgeBankState,
    KnowledgeBankActions,
} from '../types/knowledgeBank';

type KnowledgeBankStore = KnowledgeBankState & KnowledgeBankActions;

const initialState: KnowledgeBankState = {
    entries: [],
    isLoading: false,
    isPanelOpen: false,
    error: null,
};

export const useKnowledgeBankStore = create<KnowledgeBankStore>()((set, get) => ({
    ...initialState,

    setEntries: (entries: KnowledgeBankEntry[]) => {
        set({ entries, error: null });
    },

    addEntry: (entry: KnowledgeBankEntry) => {
        set((state) => ({ entries: [...state.entries, entry] }));
    },

    updateEntry: (entryId: string, updates: Partial<KnowledgeBankEntry>) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === entryId ? { ...e, ...updates, updatedAt: new Date() } : e
            ),
        }));
    },

    removeEntry: (entryId: string) => {
        set((state) => ({
            entries: state.entries.filter((e) => e.id !== entryId),
        }));
    },

    toggleEntry: (entryId: string) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === entryId ? { ...e, enabled: !e.enabled, updatedAt: new Date() } : e
            ),
        }));
    },

    clearEntries: () => {
        set({ entries: [] });
    },

    setLoading: (isLoading: boolean) => {
        set({ isLoading });
    },

    setError: (error: string | null) => {
        set({ error });
    },

    setPanelOpen: (isPanelOpen: boolean) => {
        set({ isPanelOpen });
    },

    getEnabledEntries: () => {
        return get().entries.filter((e) => e.enabled);
    },

    getEntryCount: () => {
        return get().entries.length;
    },
}));
```

**~75 lines. Follows `workspaceStore.ts` pattern exactly.**

### Step 1.7 — Write tests

**File**: `src/features/knowledgeBank/__tests__/knowledgeBankStore.test.ts`

```typescript
/**
 * Knowledge Bank Store Tests
 * TDD: Tests for all store actions and selectors
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

const createMockEntry = (overrides?: Partial<KnowledgeBankEntry>): KnowledgeBankEntry => ({
    id: `kb-${Date.now()}`,
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'Test content',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('knowledgeBankStore', () => {
    beforeEach(() => {
        useKnowledgeBankStore.setState({
            entries: [],
            isLoading: false,
            isPanelOpen: false,
            error: null,
        });
    });

    describe('initial state', () => {
        it('starts with empty entries', () => {
            const state = useKnowledgeBankStore.getState();
            expect(state.entries).toEqual([]);
            expect(state.isLoading).toBe(false);
            expect(state.isPanelOpen).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('addEntry', () => {
        it('adds an entry to the list', () => {
            const entry = createMockEntry({ id: 'kb-1' });
            useKnowledgeBankStore.getState().addEntry(entry);
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(1);
            expect(useKnowledgeBankStore.getState().entries[0].id).toBe('kb-1');
        });

        it('appends to existing entries', () => {
            const entry1 = createMockEntry({ id: 'kb-1' });
            const entry2 = createMockEntry({ id: 'kb-2' });
            useKnowledgeBankStore.getState().addEntry(entry1);
            useKnowledgeBankStore.getState().addEntry(entry2);
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(2);
        });
    });

    describe('updateEntry', () => {
        it('updates the matching entry', () => {
            const entry = createMockEntry({ id: 'kb-1', title: 'Old Title' });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().updateEntry('kb-1', { title: 'New Title' });
            expect(useKnowledgeBankStore.getState().entries[0].title).toBe('New Title');
        });

        it('does not affect other entries', () => {
            const entry1 = createMockEntry({ id: 'kb-1', title: 'Keep' });
            const entry2 = createMockEntry({ id: 'kb-2', title: 'Change' });
            useKnowledgeBankStore.getState().setEntries([entry1, entry2]);
            useKnowledgeBankStore.getState().updateEntry('kb-2', { title: 'Changed' });
            expect(useKnowledgeBankStore.getState().entries[0].title).toBe('Keep');
            expect(useKnowledgeBankStore.getState().entries[1].title).toBe('Changed');
        });
    });

    describe('removeEntry', () => {
        it('removes the matching entry', () => {
            const entry = createMockEntry({ id: 'kb-1' });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().removeEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });
    });

    describe('toggleEntry', () => {
        it('toggles enabled state', () => {
            const entry = createMockEntry({ id: 'kb-1', enabled: true });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().toggleEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries[0].enabled).toBe(false);
            useKnowledgeBankStore.getState().toggleEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries[0].enabled).toBe(true);
        });
    });

    describe('getEnabledEntries', () => {
        it('returns only enabled entries', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1', enabled: true }),
                createMockEntry({ id: 'kb-2', enabled: false }),
                createMockEntry({ id: 'kb-3', enabled: true }),
            ]);
            const enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(2);
            expect(enabled.map((e) => e.id)).toEqual(['kb-1', 'kb-3']);
        });

        it('returns empty array when no entries enabled', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1', enabled: false }),
            ]);
            expect(useKnowledgeBankStore.getState().getEnabledEntries()).toHaveLength(0);
        });
    });

    describe('getEntryCount', () => {
        it('returns total entry count', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1' }),
                createMockEntry({ id: 'kb-2' }),
            ]);
            expect(useKnowledgeBankStore.getState().getEntryCount()).toBe(2);
        });
    });

    describe('setLoading', () => {
        it('sets loading state', () => {
            useKnowledgeBankStore.getState().setLoading(true);
            expect(useKnowledgeBankStore.getState().isLoading).toBe(true);
        });
    });

    describe('setError', () => {
        it('sets error message', () => {
            useKnowledgeBankStore.getState().setError('Something failed');
            expect(useKnowledgeBankStore.getState().error).toBe('Something failed');
        });

        it('clears error with null', () => {
            useKnowledgeBankStore.getState().setError('err');
            useKnowledgeBankStore.getState().setError(null);
            expect(useKnowledgeBankStore.getState().error).toBeNull();
        });
    });

    describe('setPanelOpen', () => {
        it('controls panel visibility', () => {
            useKnowledgeBankStore.getState().setPanelOpen(true);
            expect(useKnowledgeBankStore.getState().isPanelOpen).toBe(true);
            useKnowledgeBankStore.getState().setPanelOpen(false);
            expect(useKnowledgeBankStore.getState().isPanelOpen).toBe(false);
        });
    });

    describe('clearEntries', () => {
        it('removes all entries', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1' }),
                createMockEntry({ id: 'kb-2' }),
            ]);
            useKnowledgeBankStore.getState().clearEntries();
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });
    });
});
```

**~140 lines. Covers all actions, selectors, and edge cases.**

**File**: `src/features/knowledgeBank/__tests__/knowledgeBankService.test.ts`

```typescript
/**
 * Knowledge Bank Service Tests
 * TDD: Tests for Firestore CRUD (mocked)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase before imports
vi.mock('@/config/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('../utils/sanitizer', () => ({
    sanitizeContent: (s: string) => s, // pass-through in tests
}));

import { addKBEntry, updateKBEntry, deleteKBEntry, loadKBEntries } from '../services/knowledgeBankService';
import { setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import type { KnowledgeBankEntryInput } from '../types/knowledgeBank';

describe('knowledgeBankService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validInput: KnowledgeBankEntryInput = {
        type: 'text',
        title: 'Test Entry',
        content: 'Some test content',
    };

    describe('addKBEntry', () => {
        it('creates entry and calls setDoc', async () => {
            const entry = await addKBEntry('user-1', 'ws-1', validInput);
            expect(entry.title).toBe('Test Entry');
            expect(entry.content).toBe('Some test content');
            expect(entry.type).toBe('text');
            expect(entry.enabled).toBe(true);
            expect(entry.id).toMatch(/^kb-/);
            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it('rejects empty title', async () => {
            await expect(
                addKBEntry('user-1', 'ws-1', { ...validInput, title: '  ' })
            ).rejects.toThrow();
        });

        it('rejects oversized content', async () => {
            const bigContent = 'x'.repeat(10_001);
            await expect(
                addKBEntry('user-1', 'ws-1', { ...validInput, content: bigContent })
            ).rejects.toThrow();
        });

        it('rejects when max entries reached', async () => {
            // Mock 20 existing entries
            const mockDocs = Array.from({ length: 20 }, (_, i) => ({
                data: () => ({ id: `kb-${i}`, type: 'text', title: `E${i}`, content: '', enabled: true }),
            }));
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs } as never);

            await expect(
                addKBEntry('user-1', 'ws-1', validInput)
            ).rejects.toThrow();
        });
    });

    describe('updateKBEntry', () => {
        it('calls setDoc with merge', async () => {
            await updateKBEntry('user-1', 'ws-1', 'kb-1', { title: 'Updated' });
            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it('rejects empty title update', async () => {
            await expect(
                updateKBEntry('user-1', 'ws-1', 'kb-1', { title: '' })
            ).rejects.toThrow();
        });

        it('rejects oversized content update', async () => {
            const bigContent = 'x'.repeat(10_001);
            await expect(
                updateKBEntry('user-1', 'ws-1', 'kb-1', { content: bigContent })
            ).rejects.toThrow();
        });
    });

    describe('deleteKBEntry', () => {
        it('calls deleteDoc', async () => {
            await deleteKBEntry('user-1', 'ws-1', 'kb-1');
            expect(deleteDoc).toHaveBeenCalledTimes(1);
        });
    });

    describe('loadKBEntries', () => {
        it('returns empty array when no entries', async () => {
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as never);
            const entries = await loadKBEntries('user-1', 'ws-1');
            expect(entries).toEqual([]);
        });

        it('maps Firestore docs to KnowledgeBankEntry', async () => {
            const mockDocs = [{
                data: () => ({
                    id: 'kb-1', type: 'text', title: 'Test',
                    content: 'Content', enabled: true,
                    createdAt: { toDate: () => new Date('2026-01-01') },
                    updatedAt: { toDate: () => new Date('2026-01-02') },
                }),
            }];
            vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs } as never);

            const entries = await loadKBEntries('user-1', 'ws-1');
            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('kb-1');
            expect(entries[0].title).toBe('Test');
            expect(entries[0].workspaceId).toBe('ws-1');
        });
    });
});
```

**~120 lines. Mocked Firestore, tests validation + CRUD.**

**File**: `src/features/knowledgeBank/__tests__/sanitizer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeContent, isContentWithinLimit } from '../utils/sanitizer';

describe('sanitizeContent', () => {
    it('strips HTML tags', () => {
        expect(sanitizeContent('<b>bold</b>')).toBe('bold');
    });

    it('strips script tags with content', () => {
        expect(sanitizeContent('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('strips javascript: protocol', () => {
        expect(sanitizeContent('javascript:alert(1)')).toBe('alert(1)');
    });

    it('strips event handlers', () => {
        expect(sanitizeContent('onerror=alert(1)')).toBe('alert(1)');
    });

    it('preserves plain text', () => {
        expect(sanitizeContent('Hello World')).toBe('Hello World');
    });

    it('preserves markdown formatting', () => {
        expect(sanitizeContent('# Heading\n- list item')).toBe('# Heading\n- list item');
    });
});

describe('isContentWithinLimit', () => {
    it('returns true when within limit', () => {
        expect(isContentWithinLimit('hello', 10)).toBe(true);
    });

    it('returns false when exceeding limit', () => {
        expect(isContentWithinLimit('hello world', 5)).toBe(false);
    });

    it('returns true at exact limit', () => {
        expect(isContentWithinLimit('hello', 5)).toBe(true);
    });
});
```

**~40 lines.**

### Phase 1 Exit Criteria

```bash
npm run lint   # → 0 errors
npm run test   # → ALL tests pass (existing + new)
npm run build  # → success
```

**Tech debt audit checklist:**
- [ ] All new files under 300 lines
- [ ] No hardcoded strings (all from `strings.knowledgeBank.*`)
- [ ] No `any` types
- [ ] No TODO comments
- [ ] No duplicated logic
- [ ] Report findings + resolve before Phase 2

---

## Phase 2: AI Integration (Context Builder + Injection + Tests)

**Goal**: Wire Knowledge Bank into both AI flows. This is the core value.

### Step 2.1 — Context builder hook (TDD)

**File**: `src/features/knowledgeBank/hooks/useKnowledgeBankContext.ts`

```typescript
/**
 * useKnowledgeBankContext — Builds formatted context string from enabled KB entries
 * Handles token budgeting and truncation for AI injection
 */
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { KB_MAX_CONTEXT_TOKENS } from '../types/knowledgeBank';

/** Approximate token count (1 token ≈ 4 chars for English text) */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/** Truncate text to fit within token budget */
function truncateToTokenBudget(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars - 3) + '...';
}

/**
 * Build formatted context string from enabled Knowledge Bank entries
 * Returns empty string if no entries are enabled (zero overhead)
 */
export function buildKnowledgeBankContext(
    entries: { title: string; content: string }[]
): string {
    if (entries.length === 0) return '';

    const sections = entries.map(
        (entry, i) => `[Knowledge ${i + 1}: ${entry.title}]\n${entry.content}`
    );

    const combined = sections.join('\n\n');
    return truncateToTokenBudget(combined, KB_MAX_CONTEXT_TOKENS);
}

/**
 * Hook that returns the current Knowledge Bank context string
 * Call this in AI generation/transform hooks
 */
export function useKnowledgeBankContext(): string {
    const enabledEntries = useKnowledgeBankStore.getState().getEnabledEntries();
    return buildKnowledgeBankContext(enabledEntries);
}
```

**~45 lines. Pure functions for testability, thin hook wrapper.**

### Step 2.2 — Modify Gemini service

**File**: `src/features/ai/services/geminiService.ts`

**Changes** (minimal, additive):

1. **`generateContentWithContext`** — Add optional `knowledgeBankContext` parameter:

```typescript
// BEFORE (line 122-125):
export async function generateContentWithContext(
    prompt: string,
    contextChain: string[]
): Promise<string> {

// AFTER:
export async function generateContentWithContext(
    prompt: string,
    contextChain: string[],
    knowledgeBankContext?: string
): Promise<string> {
```

2. **Build prompt with KB context** — Modify the `fullPrompt` construction (line 140-147):

```typescript
// BEFORE:
    const fullPrompt = `${SYSTEM_PROMPTS.chainGeneration}

Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;

// AFTER:
    const kbSection = knowledgeBankContext
        ? `\nWorkspace Knowledge Bank:\n${knowledgeBankContext}\n`
        : '';

    const fullPrompt = `${SYSTEM_PROMPTS.chainGeneration}
${kbSection}
Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;
```

3. **`transformContent`** — Add optional `knowledgeBankContext` parameter:

```typescript
// BEFORE (line 195-198):
export async function transformContent(
    content: string,
    type: TransformationType
): Promise<string> {

// AFTER:
export async function transformContent(
    content: string,
    type: TransformationType,
    knowledgeBankContext?: string
): Promise<string> {
```

4. **Build transform prompt with KB context** (line 204-209):

```typescript
// BEFORE:
    const fullPrompt = `${systemPrompt}

Text to transform:
${content}

Transformed text:`;

// AFTER:
    const kbSection = knowledgeBankContext
        ? `\nWorkspace context to consider:\n${knowledgeBankContext}\n`
        : '';

    const fullPrompt = `${systemPrompt}
${kbSection}
Text to transform:
${content}

Transformed text:`;
```

### Step 2.3 — Modify generation hook

**File**: `src/features/ai/hooks/useNodeGeneration.ts`

**Changes** (2 lines):

```typescript
// ADD import at top (after line 11):
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';

// INSIDE generateFromPrompt callback, before the try block (after line 70):
            const knowledgeBankContext = useKnowledgeBankContext();

// MODIFY the generateContentWithContext call (line 72):
// BEFORE:
                const content = await generateContentWithContext(promptText, contextChain);
// AFTER:
                const content = await generateContentWithContext(promptText, contextChain, knowledgeBankContext);
```

### Step 2.4 — Modify transform hook

**File**: `src/features/ai/hooks/useNodeTransformation.ts`

**Changes** (2 lines):

```typescript
// ADD import at top (after line 7):
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';

// INSIDE transformNodeContent callback, before the try block (after line 29):
            const knowledgeBankContext = useKnowledgeBankContext();

// MODIFY the transformContent call (line 32):
// BEFORE:
                const transformedContent = await transformContent(content, type);
// AFTER:
                const transformedContent = await transformContent(content, type, knowledgeBankContext);
```

### Step 2.5 — Write tests

**File**: `src/features/knowledgeBank/__tests__/useKnowledgeBankContext.test.ts`

```typescript
/**
 * Knowledge Bank Context Builder Tests
 * Tests context string formatting, truncation, and token budgeting
 */
import { describe, it, expect } from 'vitest';
import { buildKnowledgeBankContext } from '../hooks/useKnowledgeBankContext';

describe('buildKnowledgeBankContext', () => {
    it('returns empty string for no entries', () => {
        expect(buildKnowledgeBankContext([])).toBe('');
    });

    it('formats single entry correctly', () => {
        const result = buildKnowledgeBankContext([
            { title: 'Guest List', content: '30 families with kids' },
        ]);
        expect(result).toContain('[Knowledge 1: Guest List]');
        expect(result).toContain('30 families with kids');
    });

    it('formats multiple entries with numbering', () => {
        const result = buildKnowledgeBankContext([
            { title: 'Guests', content: '30 families' },
            { title: 'Theme', content: 'Traditional fusion' },
        ]);
        expect(result).toContain('[Knowledge 1: Guests]');
        expect(result).toContain('[Knowledge 2: Theme]');
    });

    it('separates entries with double newlines', () => {
        const result = buildKnowledgeBankContext([
            { title: 'A', content: 'Content A' },
            { title: 'B', content: 'Content B' },
        ]);
        expect(result).toContain('Content A\n\n[Knowledge 2:');
    });

    it('truncates when exceeding token budget', () => {
        const longContent = 'x'.repeat(20_000); // Way over 3000 tokens
        const result = buildKnowledgeBankContext([
            { title: 'Long', content: longContent },
        ]);
        expect(result.length).toBeLessThan(20_000);
        expect(result).toMatch(/\.\.\.$/);
    });

    it('does not truncate when within budget', () => {
        const result = buildKnowledgeBankContext([
            { title: 'Short', content: 'Brief note' },
        ]);
        expect(result).not.toMatch(/\.\.\.$/);
    });
});
```

**~55 lines.**

**File**: `src/features/knowledgeBank/__tests__/aiIntegration.test.ts`

```typescript
/**
 * AI Integration Tests — Verifies KB context flows into AI prompts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock firebase
vi.mock('@/config/firebase', () => ({ db: {} }));

import { generateContentWithContext, transformContent } from '@/features/ai/services/geminiService';

describe('AI Integration with Knowledge Bank', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock successful Gemini response
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: 'AI response' }] } }],
            }),
        });
    });

    describe('generateContentWithContext', () => {
        it('includes KB context in prompt when provided', async () => {
            await generateContentWithContext(
                'Suggest next song',
                ['Song 1: Rang Barse'],
                'Guest List: 30 families with kids'
            );

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            const promptText = callBody.contents[0].parts[0].text as string;
            expect(promptText).toContain('Knowledge Bank');
            expect(promptText).toContain('30 families with kids');
            expect(promptText).toContain('Rang Barse');
            expect(promptText).toContain('Suggest next song');
        });

        it('omits KB section when context is undefined', async () => {
            await generateContentWithContext(
                'Suggest next song',
                ['Song 1: Rang Barse']
            );

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            const promptText = callBody.contents[0].parts[0].text as string;
            expect(promptText).not.toContain('Knowledge Bank');
        });

        it('omits KB section when context is empty string', async () => {
            await generateContentWithContext('Prompt', ['Context'], '');

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            const promptText = callBody.contents[0].parts[0].text as string;
            expect(promptText).not.toContain('Knowledge Bank');
        });
    });

    describe('transformContent', () => {
        it('includes KB context in transform prompt when provided', async () => {
            await transformContent(
                'Original text about songs',
                'refine',
                'Theme: Family-friendly traditional celebration'
            );

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            const promptText = callBody.contents[0].parts[0].text as string;
            expect(promptText).toContain('context to consider');
            expect(promptText).toContain('Family-friendly');
        });

        it('omits KB section when context is undefined', async () => {
            await transformContent('Some text', 'shorten');

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
            const promptText = callBody.contents[0].parts[0].text as string;
            expect(promptText).not.toContain('context to consider');
        });
    });
});
```

**~90 lines. Tests KB context is correctly injected into both AI flows.**

### Phase 2 Exit Criteria

```bash
npm run lint   # → 0 errors
npm run test   # → ALL tests pass
npm run build  # → success
```

**Tech debt audit + resolve before Phase 3.**

---

## Phase 3: UI — Add Button, Upload & File Processing (+ Tests)

**Goal**: User can add text and files to Knowledge Bank via toolbar button.

### Step 3.1 — Image compressor utility (TDD)

**File**: `src/features/knowledgeBank/utils/imageCompressor.ts`

```typescript
/**
 * Image Compressor — Client-side image compression using Canvas API
 * Reduces image size before upload to Firebase Storage
 */
import { KB_MAX_IMAGE_DIMENSION, KB_IMAGE_QUALITY } from '../types/knowledgeBank';

/** Compress an image file: resize to max dimension, convert to JPEG */
export async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const { width, height } = calculateDimensions(img.width, img.height);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context unavailable'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Compression failed'));
                },
                'image/jpeg',
                KB_IMAGE_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/** Calculate new dimensions preserving aspect ratio */
export function calculateDimensions(
    width: number,
    height: number
): { width: number; height: number } {
    const maxDim = KB_MAX_IMAGE_DIMENSION;
    if (width <= maxDim && height <= maxDim) return { width, height };

    const ratio = Math.min(maxDim / width, maxDim / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}
```

**~55 lines.**

### Step 3.2 — Firebase Storage service

**File**: `src/features/knowledgeBank/services/storageService.ts`

```typescript
/**
 * Knowledge Bank Storage Service — Firebase Storage for file uploads
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { app } from '@/config/firebase';
import { KB_MAX_FILE_SIZE, KB_ACCEPTED_MIME_TYPES } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';

const storage = getStorage(app);

/** Build storage path for a KB file */
function getStoragePath(
    userId: string, workspaceId: string, entryId: string, filename: string
): string {
    return `users/${userId}/workspaces/${workspaceId}/knowledge-bank/${entryId}/${filename}`;
}

/** Validate file before upload */
function validateFile(file: File | Blob, originalName: string): void {
    if (file.size > KB_MAX_FILE_SIZE) {
        throw new Error(strings.knowledgeBank.errors.fileTooLarge);
    }
    const mimeType = file.type || '';
    if (!KB_ACCEPTED_MIME_TYPES.includes(mimeType as typeof KB_ACCEPTED_MIME_TYPES[number])) {
        throw new Error(strings.knowledgeBank.errors.unsupportedType);
    }
}

/** Upload file to Firebase Storage, return download URL */
export async function uploadKBFile(
    userId: string,
    workspaceId: string,
    entryId: string,
    file: File | Blob,
    filename: string
): Promise<string> {
    validateFile(file, filename);
    const storageRef = ref(storage, getStoragePath(userId, workspaceId, entryId, filename));
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

/** Delete file from Firebase Storage */
export async function deleteKBFile(
    userId: string,
    workspaceId: string,
    entryId: string,
    filename: string
): Promise<void> {
    const storageRef = ref(storage, getStoragePath(userId, workspaceId, entryId, filename));
    try {
        await deleteObject(storageRef);
    } catch {
        // File may not exist — safe to ignore
    }
}
```

**~60 lines.**

### Step 3.3 — File processor hook (TDD)

**File**: `src/features/knowledgeBank/hooks/useFileProcessor.ts`

```typescript
/**
 * useFileProcessor — Processes uploaded files for Knowledge Bank
 * Text files → read as string | Images → compress + upload + describe
 */
import { useCallback, useState } from 'react';
import { compressImage } from '../utils/imageCompressor';
import { uploadKBFile } from '../services/storageService';
import { addKBEntry } from '../services/knowledgeBankService';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { sanitizeContent } from '../utils/sanitizer';
import { KB_MAX_FILE_SIZE } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

export function useFileProcessor() {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFile = useCallback(async (file: File) => {
        const userId = useAuthStore.getState().user?.uid;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        if (file.size > KB_MAX_FILE_SIZE) {
            toast.error(strings.knowledgeBank.errors.fileTooLarge);
            return;
        }

        setIsProcessing(true);
        try {
            if (file.type.startsWith('image/')) {
                await processImageFile(file, userId, workspaceId);
            } else {
                await processTextFile(file, userId, workspaceId);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : strings.knowledgeBank.errors.uploadFailed;
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return { processFile, isProcessing };
}

/** Read text file content and save as KB entry */
async function processTextFile(file: File, userId: string, workspaceId: string): Promise<void> {
    const text = await file.text();
    const sanitized = sanitizeContent(text);
    const title = file.name.replace(/\.[^/.]+$/, ''); // Strip extension

    const entry = await addKBEntry(userId, workspaceId, {
        type: 'text',
        title,
        content: sanitized,
        originalFileName: file.name,
        mimeType: file.type,
    });
    useKnowledgeBankStore.getState().addEntry(entry);
}

/** Compress image, upload, describe via Gemini Vision, save as KB entry */
async function processImageFile(file: File, userId: string, workspaceId: string): Promise<void> {
    const compressed = await compressImage(file);
    const entryId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const filename = `${file.name.replace(/\.[^/.]+$/, '')}.jpg`;

    const storageUrl = await uploadKBFile(userId, workspaceId, entryId, compressed, filename);

    // TODO(Phase 3): Integrate Gemini Vision for auto-description
    // For now, use filename as placeholder description
    const description = `Image: ${file.name}`;

    const entry = await addKBEntry(userId, workspaceId, {
        type: 'image',
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: description,
        originalFileName: file.name,
        storageUrl,
        mimeType: 'image/jpeg',
    });
    useKnowledgeBankStore.getState().addEntry(entry);
}
```

**~75 lines (at hook limit). Image Vision integration marked for Phase 3 completion.**

### Step 3.4 — Paste Text Modal

**File**: `src/features/knowledgeBank/components/PasteTextModal.tsx`

```typescript
/**
 * PasteTextModal — Simple modal for adding text entries to Knowledge Bank
 */
import { useState, useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import styles from './PasteTextModal.module.css';

interface PasteTextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, content: string) => void;
}

export function PasteTextModal({ isOpen, onClose, onSave }: PasteTextModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    const handleSave = useCallback(() => {
        if (!title.trim() || !content.trim()) return;
        onSave(title.trim(), content);
        setTitle('');
        setContent('');
    }, [title, content, onSave]);

    if (!isOpen) return null;

    const kb = strings.knowledgeBank;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h4 className={styles.title}>{kb.saveEntry}</h4>
                    <button className={styles.closeButton} onClick={onClose} aria-label={strings.settings.close}>
                        &times;
                    </button>
                </div>
                <div className={styles.body}>
                    <input
                        className={styles.titleInput}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={kb.titlePlaceholder}
                        maxLength={100}
                    />
                    <textarea
                        className={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={kb.contentPlaceholder}
                        maxLength={KB_MAX_CONTENT_SIZE}
                    />
                    <div className={styles.charCount}>
                        {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        {strings.common.cancel}
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!title.trim() || !content.trim()}
                    >
                        {kb.saveEntry}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

**~85 lines. Follows UpgradePrompt modal pattern.**

**File**: `src/features/knowledgeBank/components/PasteTextModal.module.css`

```css
/* PasteTextModal styles — uses CSS variables exclusively */
.overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
}

.backdrop {
    position: absolute;
    inset: 0;
    background: hsla(220, 13%, 13%, 0.5);
    backdrop-filter: blur(4px);
}

.modal {
    position: relative;
    width: 90%;
    max-width: 480px;
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
}

.title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

.closeButton {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--color-surface-hover);
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.body {
    padding: var(--space-md);
}

.titleInput {
    width: 100%;
    height: 36px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0 var(--space-sm);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-sm);
}

.titleInput:focus {
    outline: none;
    border-color: var(--color-border-focus);
}

.textarea {
    width: 100%;
    height: 160px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-family: var(--font-family);
    resize: none;
    line-height: var(--line-height-normal);
}

.textarea:focus {
    outline: none;
    border-color: var(--color-border-focus);
}

.charCount {
    text-align: right;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: var(--space-xs);
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-top: 1px solid var(--color-border);
}

.cancelButton {
    background: var(--color-surface-hover);
    color: var(--color-text-secondary);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-sm);
    cursor: pointer;
}

.saveButton {
    background: var(--color-primary);
    color: var(--header-text);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background var(--transition-fast);
}

.saveButton:hover:not(:disabled) {
    background: var(--color-primary-hover);
}

.saveButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

### Step 3.5 — Add Button component

**File**: `src/features/knowledgeBank/components/KnowledgeBankAddButton.tsx`

```typescript
/**
 * KnowledgeBankAddButton — Toolbar button with dropdown menu
 * Positioned left of SearchBar in top toolbar
 */
import { useState, useCallback, useRef } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { PasteTextModal } from './PasteTextModal';
import { addKBEntry } from '../services/knowledgeBankService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { sanitizeContent } from '../utils/sanitizer';
import { KB_MAX_ENTRIES, KB_ACCEPTED_TEXT_TYPES, KB_ACCEPTED_IMAGE_TYPES } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from './KnowledgeBankAddButton.module.css';

const ACCEPTED_EXTENSIONS = [...KB_ACCEPTED_TEXT_TYPES, ...KB_ACCEPTED_IMAGE_TYPES].join(',');

export function KnowledgeBankAddButton() {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const entryCount = useKnowledgeBankStore((s) => s.entries.length);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const { processFile, isProcessing } = useFileProcessor();

    const isMaxReached = entryCount >= KB_MAX_ENTRIES;
    const kb = strings.knowledgeBank;

    const handleUploadClick = useCallback(() => {
        setDropdownOpen(false);
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [processFile]);

    const handlePasteClick = useCallback(() => {
        setDropdownOpen(false);
        setModalOpen(true);
    }, []);

    const handlePasteSave = useCallback(async (title: string, content: string) => {
        const userId = useAuthStore.getState().user?.uid;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        try {
            const entry = await addKBEntry(userId, workspaceId, {
                type: 'text',
                title,
                content: sanitizeContent(content),
            });
            useKnowledgeBankStore.getState().addEntry(entry);
            setModalOpen(false);
        } catch (error) {
            const msg = error instanceof Error ? error.message : kb.errors.saveFailed;
            toast.error(msg);
        }
    }, [kb.errors.saveFailed]);

    const handleViewClick = useCallback(() => {
        setDropdownOpen(false);
        setPanelOpen(true);
    }, [setPanelOpen]);

    return (
        <>
            <div className={styles.container}>
                <button
                    className={styles.addButton}
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    title={kb.addButton}
                    disabled={isProcessing}
                >
                    <span className={styles.icon}>📎</span>
                    {entryCount > 0 && <span className={styles.badge}>{entryCount}</span>}
                </button>
                {isDropdownOpen && (
                    <div className={styles.dropdown}>
                        {isMaxReached ? (
                            <div className={styles.maxReached}>
                                <span className={styles.dropdownIcon}>⚠️</span>
                                <div>
                                    <div className={styles.dropdownLabel}>{kb.maxEntriesReached}</div>
                                    <div className={styles.dropdownHint}>{kb.maxEntriesDescription}</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button className={styles.dropdownItem} onClick={handleUploadClick}>
                                    <span className={styles.dropdownIcon}>📄</span> {kb.uploadFile}
                                </button>
                                <button className={styles.dropdownItem} onClick={handlePasteClick}>
                                    <span className={styles.dropdownIcon}>📝</span> {kb.pasteText}
                                </button>
                            </>
                        )}
                        <div className={styles.divider} />
                        <button className={styles.dropdownItemView} onClick={handleViewClick}>
                            <span className={styles.dropdownIcon}>📚</span>
                            {kb.viewBank} ({entryCount})
                        </button>
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className={styles.hiddenInput}
            />
            <PasteTextModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handlePasteSave}
            />
        </>
    );
}
```

**~100 lines (at component limit).**

### Step 3.6 — Toolbar integration

**File**: `src/shared/components/Layout.tsx`

**Changes** (2 lines):

```typescript
// ADD import (after line 10):
import { KnowledgeBankAddButton } from '@/features/knowledgeBank/components/KnowledgeBankAddButton';

// ADD component in topBar (line 41, BEFORE SearchBar):
                <header className={styles.topBar}>
                    <KnowledgeBankAddButton />
                    <SearchBar onResultClick={handleSearchResultClick} />
                    <WorkspaceControls />
                    <SyncStatusIndicator />
                </header>
```

### Phase 3 Exit Criteria

```bash
npm run lint && npm run test && npm run build
```

**Tech debt audit**: Check for any files exceeding limits, hardcoded values, missing tests. Resolve all before Phase 4.

---

## Phase 4: UI — Knowledge Bank Management Panel (+ Tests)

**Goal**: User can view, edit, toggle, and delete KB entries.

### Step 4.1 — Entry Card component

**File**: `src/features/knowledgeBank/components/KnowledgeBankEntryCard.tsx`

```typescript
/**
 * KnowledgeBankEntryCard — Single entry card in the KB panel
 * Shows title, content preview, toggle, edit/delete actions
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KnowledgeBankEntryEditor } from './KnowledgeBankEntryEditor';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import styles from './KnowledgeBankPanel.module.css';

interface KnowledgeBankEntryCardProps {
    entry: KnowledgeBankEntry;
    onToggle: (entryId: string) => void;
    onUpdate: (entryId: string, title: string, content: string) => void;
    onDelete: (entryId: string) => void;
}

export const KnowledgeBankEntryCard = React.memo(function KnowledgeBankEntryCard({
    entry, onToggle, onUpdate, onDelete,
}: KnowledgeBankEntryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const kb = strings.knowledgeBank;
    const typeIcon = entry.type === 'image' ? '🖼️' : '📄';

    const handleDelete = useCallback(() => {
        if (window.confirm(kb.deleteConfirm)) {
            onDelete(entry.id);
        }
    }, [entry.id, onDelete, kb.deleteConfirm]);

    const handleSave = useCallback((title: string, content: string) => {
        onUpdate(entry.id, title, content);
        setIsEditing(false);
    }, [entry.id, onUpdate]);

    if (isEditing) {
        return (
            <KnowledgeBankEntryEditor
                entry={entry}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className={`${styles.entryCard} ${entry.enabled ? '' : styles.entryDisabled}`}>
            <div className={styles.entryHeader}>
                <span className={styles.typeIcon}>{typeIcon}</span>
                <span className={styles.entryTitle}>{entry.title}</span>
                <button
                    className={`${styles.toggle} ${entry.enabled ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() => onToggle(entry.id)}
                    title={entry.enabled ? kb.toggleDisable : kb.toggleEnable}
                >
                    <span className={styles.toggleKnob} />
                </button>
            </div>
            <p className={styles.entryPreview}>{entry.content.slice(0, 120)}</p>
            <div className={styles.entryActions}>
                <button className={styles.actionButton} onClick={() => setIsEditing(true)}>
                    {kb.editEntry}
                </button>
                <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={handleDelete}>
                    {kb.deleteEntry}
                </button>
            </div>
        </div>
    );
});
```

**~70 lines. Memoized with `React.memo`.**

### Step 4.2 — Entry Editor component

**File**: `src/features/knowledgeBank/components/KnowledgeBankEntryEditor.tsx`

```typescript
/**
 * KnowledgeBankEntryEditor — Inline editor for KB entry title + content
 */
import { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import styles from './KnowledgeBankPanel.module.css';

interface KnowledgeBankEntryEditorProps {
    entry: KnowledgeBankEntry;
    onSave: (title: string, content: string) => void;
    onCancel: () => void;
}

export function KnowledgeBankEntryEditor({ entry, onSave, onCancel }: KnowledgeBankEntryEditorProps) {
    const [title, setTitle] = useState(entry.title);
    const [content, setContent] = useState(entry.content);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        onSave(title.trim(), content);
    }, [title, content, onSave]);

    return (
        <div className={`${styles.entryCard} ${styles.entryEditing}`}>
            <input
                className={styles.editInput}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.knowledgeBank.titlePlaceholder}
                maxLength={100}
            />
            <textarea
                className={styles.editTextarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={KB_MAX_CONTENT_SIZE}
            />
            <div className={styles.editCharCount}>
                {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
            </div>
            <div className={styles.editActions}>
                <button className={styles.editCancelButton} onClick={onCancel}>
                    {strings.common.cancel}
                </button>
                <button
                    className={styles.editSaveButton}
                    onClick={handleSave}
                    disabled={!title.trim()}
                >
                    {strings.common.save}
                </button>
            </div>
        </div>
    );
}
```

**~55 lines.**

### Step 4.3 — Knowledge Bank Panel

**File**: `src/features/knowledgeBank/components/KnowledgeBankPanel.tsx`

```typescript
/**
 * KnowledgeBankPanel — Slide-out panel for managing KB entries
 * Slides from left edge, non-blocking (canvas remains visible)
 */
import { useCallback, useEffect } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { updateKBEntry, deleteKBEntry } from '../services/knowledgeBankService';
import { deleteKBFile } from '../services/storageService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from './KnowledgeBankPanel.module.css';

export function KnowledgeBankPanel() {
    const isPanelOpen = useKnowledgeBankStore((s) => s.isPanelOpen);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const kb = strings.knowledgeBank;

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isPanelOpen) setPanelOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isPanelOpen, setPanelOpen]);

    const handleToggle = useCallback((entryId: string) => {
        const userId = useAuthStore.getState().user?.uid;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().toggleEntry(entryId);
        const entry = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        if (entry) {
            void updateKBEntry(userId, workspaceId, entryId, { enabled: entry.enabled });
        }
    }, []);

    const handleUpdate = useCallback((entryId: string, title: string, content: string) => {
        const userId = useAuthStore.getState().user?.uid;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().updateEntry(entryId, { title, content });
        void updateKBEntry(userId, workspaceId, entryId, { title, content });
    }, []);

    const handleDelete = useCallback(async (entryId: string) => {
        const userId = useAuthStore.getState().user?.uid;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const entry = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        try {
            if (entry?.originalFileName) {
                await deleteKBFile(userId, workspaceId, entryId, entry.originalFileName);
            }
            await deleteKBEntry(userId, workspaceId, entryId);
            useKnowledgeBankStore.getState().removeEntry(entryId);
        } catch {
            toast.error(kb.errors.deleteFailed);
        }
    }, [kb.errors.deleteFailed]);

    if (!isPanelOpen) return null;

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h4 className={styles.panelTitle}>{kb.title}</h4>
                <button className={styles.closeButton} onClick={() => setPanelOpen(false)}>
                    &times;
                </button>
            </div>
            <div className={styles.panelEntries}>
                {entries.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📚</div>
                        <p className={styles.emptyText}>{kb.emptyState}</p>
                        <p className={styles.emptyHint}>{kb.emptyStateDescription}</p>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <KnowledgeBankEntryCard
                            key={entry.id}
                            entry={entry}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
```

**~95 lines (under 100 limit). Delegates to EntryCard sub-component.**

### Step 4.4 — Panel CSS

**File**: `src/features/knowledgeBank/components/KnowledgeBankPanel.module.css`

This file contains styles for both the panel and entry cards (shared module). Uses CSS variables exclusively. Key classes:

- `.panel` — Fixed left panel, `width: 340px`, slide animation
- `.panelHeader` — Flex header with title + close button
- `.panelEntries` — Scrollable entry list
- `.entryCard` — Card with border, radius, padding
- `.entryDisabled` — 50% opacity for disabled entries
- `.entryEditing` — Primary border for edit mode
- `.toggle` / `.toggleOn` / `.toggleOff` — Toggle switch
- `.emptyState` — Centered empty state with icon
- `.editInput` / `.editTextarea` — Inline edit fields

All colors use `var(--color-*)`, all spacing uses `var(--space-*)`, all radii use `var(--radius-*)`.

### Phase 4 Exit Criteria

```bash
npm run lint && npm run test && npm run build
```

**Tech debt audit + resolve before Phase 5.**

---

## Phase 5: Integration Testing, Security & Polish

**Goal**: End-to-end verification, workspace lifecycle, edge cases.

### Step 5.1 — Workspace lifecycle integration

**File**: `src/features/workspace/services/workspaceService.ts`

**Change**: In `deleteWorkspace()` function, add KB cleanup:

```typescript
// ADD import at top:
import { deleteAllKBEntries } from '@/features/knowledgeBank/services/knowledgeBankService';

// MODIFY deleteWorkspace function — add KB cleanup before batch commit:
export async function deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    // Clean up Knowledge Bank entries first
    await deleteAllKBEntries(userId, workspaceId);

    const batch = writeBatch(db);
    // ... existing node/edge/workspace deletion logic ...
    await batch.commit();
}
```

### Step 5.2 — Load KB on workspace switch

Wherever workspace switching occurs (likely in the workspace switching hook/effect), add:

```typescript
import { loadKBEntries } from '@/features/knowledgeBank/services/knowledgeBankService';
import { useKnowledgeBankStore } from '@/features/knowledgeBank/stores/knowledgeBankStore';

// On workspace switch:
const entries = await loadKBEntries(userId, newWorkspaceId);
useKnowledgeBankStore.getState().setEntries(entries);

// On workspace unload:
useKnowledgeBankStore.getState().clearEntries();
```

### Step 5.3 — End-to-end integration tests

**File**: `src/features/knowledgeBank/__tests__/e2e.integration.test.ts`

Test the full flows:
1. Add text entry → appears in store → appears in AI context
2. Add image entry → compressed → uploaded → description in store
3. Toggle entry off → excluded from AI context
4. Delete entry → removed from store + Firestore
5. Switch workspace → KB clears and reloads
6. Max entries → add button disabled

### Step 5.4 — Security hardening

- [ ] All text sanitized via `sanitizeContent()` before Firestore write
- [ ] All text sanitized before AI prompt injection
- [ ] No `dangerouslySetInnerHTML` in any KB component
- [ ] File type whitelist enforced (KB_ACCEPTED_MIME_TYPES)
- [ ] File size limit enforced (5MB)
- [ ] Content size limit enforced (10KB)
- [ ] Firebase Storage rules restrict to user's path
- [ ] No `eval()` or `Function()` constructors

### Phase 5 Exit Criteria (Final)

```bash
npm run lint   # → 0 errors
npm run test   # → ALL tests pass (existing + ALL new)
npm run build  # → success
```

**Final tech debt audit → ZERO tech debt → Ready for merge to `main`.**

---

## Complete File Inventory

### New Files (16 files)
| # | File | Lines | Phase |
|---|------|-------|-------|
| 1 | `src/features/knowledgeBank/types/knowledgeBank.ts` | ~75 | P1 |
| 2 | `src/features/knowledgeBank/utils/sanitizer.ts` | ~18 | P1 |
| 3 | `src/features/knowledgeBank/services/knowledgeBankService.ts` | ~120 | P1 |
| 4 | `src/features/knowledgeBank/stores/knowledgeBankStore.ts` | ~75 | P1 |
| 5 | `src/features/knowledgeBank/__tests__/knowledgeBankStore.test.ts` | ~140 | P1 |
| 6 | `src/features/knowledgeBank/__tests__/knowledgeBankService.test.ts` | ~120 | P1 |
| 7 | `src/features/knowledgeBank/__tests__/sanitizer.test.ts` | ~40 | P1 |
| 8 | `src/features/knowledgeBank/hooks/useKnowledgeBankContext.ts` | ~45 | P2 |
| 9 | `src/features/knowledgeBank/__tests__/useKnowledgeBankContext.test.ts` | ~55 | P2 |
| 10 | `src/features/knowledgeBank/__tests__/aiIntegration.test.ts` | ~90 | P2 |
| 11 | `src/features/knowledgeBank/utils/imageCompressor.ts` | ~55 | P3 |
| 12 | `src/features/knowledgeBank/services/storageService.ts` | ~60 | P3 |
| 13 | `src/features/knowledgeBank/hooks/useFileProcessor.ts` | ~75 | P3 |
| 14 | `src/features/knowledgeBank/components/PasteTextModal.tsx` | ~85 | P3 |
| 15 | `src/features/knowledgeBank/components/KnowledgeBankAddButton.tsx` | ~100 | P3 |
| 16 | `src/features/knowledgeBank/components/KnowledgeBankEntryCard.tsx` | ~70 | P4 |
| 17 | `src/features/knowledgeBank/components/KnowledgeBankEntryEditor.tsx` | ~55 | P4 |
| 18 | `src/features/knowledgeBank/components/KnowledgeBankPanel.tsx` | ~95 | P4 |
| 19 | `src/features/knowledgeBank/__tests__/e2e.integration.test.ts` | ~100 | P5 |

### CSS Files (3 files)
| # | File | Phase |
|---|------|-------|
| 1 | `src/features/knowledgeBank/components/PasteTextModal.module.css` | P3 |
| 2 | `src/features/knowledgeBank/components/KnowledgeBankAddButton.module.css` | P3 |
| 3 | `src/features/knowledgeBank/components/KnowledgeBankPanel.module.css` | P4 |

### Modified Files (5 files)
| # | File | Phase | Change |
|---|------|-------|--------|
| 1 | `src/shared/localization/strings.ts` | P1 | Add `knowledgeBank` section |
| 2 | `src/features/ai/services/geminiService.ts` | P2 | Add `knowledgeBankContext` param to 2 functions |
| 3 | `src/features/ai/hooks/useNodeGeneration.ts` | P2 | Import + pass KB context (3 lines) |
| 4 | `src/features/ai/hooks/useNodeTransformation.ts` | P2 | Import + pass KB context (3 lines) |
| 5 | `src/shared/components/Layout.tsx` | P3 | Add KnowledgeBankAddButton (2 lines) |
| 6 | `src/features/workspace/services/workspaceService.ts` | P5 | Add KB cleanup on workspace delete |

---

## Wireframes

Interactive wireframes available at: `wireframes-knowbank.html` (in project root)
Covers all 9 planned UI states (toolbar, dropdown, modal, panel, editor, empty state, AI flow, image flow, max entries).
