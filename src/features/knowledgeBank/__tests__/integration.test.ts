/**
 * Knowledge Bank Integration Tests — Full flow verification
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { buildHierarchicalKBContext } from '../services/hierarchicalContextBuilder';
import { sanitizeContent } from '../utils/sanitizer';
import { calculateDimensions } from '../utils/imageCompressor';
import { KB_MAX_DOCUMENTS, KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

const createMockEntry = (overrides?: Partial<KnowledgeBankEntry>): KnowledgeBankEntry => ({
    id: `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'Test content',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('Knowledge Bank Integration', () => {
    beforeEach(() => {
        useKnowledgeBankStore.getState().clearEntries();
        useKnowledgeBankStore.getState().setPanelOpen(false);
        vi.restoreAllMocks();
    });

    describe('Store + Context flow', () => {
        it('enabled entries appear in AI context', () => {
            const entry = createMockEntry({ title: 'Brand Guide', content: 'Use blue tones' });
            useKnowledgeBankStore.getState().addEntry(entry);

            const enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            const context = buildHierarchicalKBContext(enabled);
            expect(context).toContain('Brand Guide');
            expect(context).toContain('Use blue tones');
        });

        it('disabled entries are excluded from AI context', () => {
            const entry = createMockEntry({ enabled: false });
            useKnowledgeBankStore.getState().addEntry(entry);

            const enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(0);

            const context = buildHierarchicalKBContext(enabled);
            expect(context).toBe('');
        });

        it('toggle changes AI context inclusion', () => {
            const entry = createMockEntry({ id: 'toggle-test', title: 'Notes' });
            useKnowledgeBankStore.getState().addEntry(entry);

            // Initially enabled → in context
            let enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(1);

            // Toggle off → out of context
            useKnowledgeBankStore.getState().toggleEntry('toggle-test');
            enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(0);

            // Toggle back on → in context again
            useKnowledgeBankStore.getState().toggleEntry('toggle-test');
            enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(1);
        });
    });

    describe('Content sanitization', () => {
        it('sanitizes script tags', () => {
            const malicious = '<script>alert("xss")</script>Important note';
            const sanitized = sanitizeContent(malicious);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('Important note');
        });

        it('sanitizes HTML event handlers', () => {
            const malicious = '<img onerror="alert(1)" src="x" />';
            const sanitized = sanitizeContent(malicious);
            expect(sanitized).not.toContain('onerror');
        });
    });

    describe('Max entries enforcement', () => {
        it('document count tracks correctly', () => {
            for (let i = 0; i < 5; i++) {
                useKnowledgeBankStore.getState().addEntry(createMockEntry({ id: `kb-${i}` }));
            }
            expect(useKnowledgeBankStore.getState().getDocumentCount()).toBe(5);
        });

        it('KB_MAX_DOCUMENTS constant is 25', () => {
            expect(KB_MAX_DOCUMENTS).toBe(25);
        });

        it('KB_MAX_CONTENT_SIZE constant is 10000', () => {
            expect(KB_MAX_CONTENT_SIZE).toBe(10_000);
        });
    });

    describe('Image compression dimensions', () => {
        it('preserves small images', () => {
            expect(calculateDimensions(500, 400)).toEqual({ width: 500, height: 400 });
        });

        it('scales down large images', () => {
            const result = calculateDimensions(3000, 2000);
            expect(result.width).toBeLessThanOrEqual(1024);
            expect(result.height).toBeLessThanOrEqual(1024);
            // Aspect ratio preserved
            const originalRatio = 3000 / 2000;
            const newRatio = result.width / result.height;
            expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
        });
    });

    describe('Workspace lifecycle', () => {
        it('clearEntries empties the store', () => {
            useKnowledgeBankStore.getState().addEntry(createMockEntry());
            useKnowledgeBankStore.getState().addEntry(createMockEntry({ id: 'kb-2' }));
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(2);

            useKnowledgeBankStore.getState().clearEntries();
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });

        it('removeEntry removes specific entry', () => {
            useKnowledgeBankStore.getState().addEntry(createMockEntry({ id: 'keep' }));
            useKnowledgeBankStore.getState().addEntry(createMockEntry({ id: 'remove' }));

            useKnowledgeBankStore.getState().removeEntry('remove');
            const ids = useKnowledgeBankStore.getState().entries.map((e) => e.id);
            expect(ids).toEqual(['keep']);
        });

        it('updateEntry modifies entry in place', () => {
            useKnowledgeBankStore.getState().addEntry(createMockEntry({ id: 'update-me' }));
            useKnowledgeBankStore.getState().updateEntry('update-me', {
                title: 'Updated Title',
                content: 'Updated content',
            });

            const entry = useKnowledgeBankStore.getState().entries[0]!;
            expect(entry.title).toBe('Updated Title');
            expect(entry.content).toBe('Updated content');
        });
    });
});
