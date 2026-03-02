/**
 * Knowledge Bank Context Builder Tests
 * TDD: Tests for buildHierarchicalKBContext (with summary + relevance support)
 * + Selector stability tests for useKnowledgeBankContext hook
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildHierarchicalKBContext } from '../services/hierarchicalContextBuilder';
import { useKnowledgeBankContext } from '../hooks/useKnowledgeBankContext';
import { KB_TOKEN_BUDGETS } from '../types/knowledgeBank';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: 'ws-1',
        type: 'text',
        title: 'Test',
        content: 'Content',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('buildHierarchicalKBContext', () => {
    it('returns empty string when no entries', () => {
        expect(buildHierarchicalKBContext([])).toBe('');
    });

    it('formats single entry correctly', () => {
        const result = buildHierarchicalKBContext([
            makeEntry({ title: 'Brand Voice', content: 'Professional and concise tone.' }),
        ]);
        expect(result).toContain('Workspace Knowledge Bank');
        expect(result).toContain('[Knowledge: Brand Voice]');
        expect(result).toContain('Professional and concise tone.');
        expect(result).toContain('End Knowledge Bank');
    });

    it('formats multiple entries', () => {
        const result = buildHierarchicalKBContext([
            makeEntry({ title: 'Style', content: 'Use bullet points.' }),
            makeEntry({ title: 'Audience', content: 'Engineers and PMs.' }),
        ]);
        expect(result).toContain('[Knowledge: Style]');
        expect(result).toContain('[Knowledge: Audience]');
    });

    it('truncates entries that exceed token budget', () => {
        const bigContent = 'x'.repeat(31_950);
        const result = buildHierarchicalKBContext([
            makeEntry({ title: 'Big', content: bigContent }),
            makeEntry({ title: 'Should Be Excluded', content: 'This should not appear' }),
        ]);
        expect(result).toContain('[Knowledge: Big]');
        expect(result).not.toContain('Should Be Excluded');
    });

    it('returns empty string if first entry alone exceeds budget', () => {
        const hugeContent = 'x'.repeat(33_000);
        const result = buildHierarchicalKBContext([
            makeEntry({ title: 'Huge', content: hugeContent }),
        ]);
        expect(result).toBe('');
    });

    describe('summary preference', () => {
        it('uses summary when available instead of content', () => {
            const result = buildHierarchicalKBContext([
                makeEntry({
                    title: 'Long Doc',
                    content: 'Very long content that is thousands of characters...',
                    summary: 'Concise summary of the long document.',
                }),
            ]);
            expect(result).toContain('Concise summary of the long document.');
            expect(result).not.toContain('Very long content');
        });

        it('falls back to content when summary is undefined', () => {
            const result = buildHierarchicalKBContext([
                makeEntry({ title: 'No Summary', content: 'Original content here.' }),
            ]);
            expect(result).toContain('Original content here.');
        });

        it('fits more entries in budget when using summaries', () => {
            const bigContent = 'x'.repeat(20_000);
            const result = buildHierarchicalKBContext([
                makeEntry({ title: 'Doc 1', content: bigContent, summary: 'Summary of doc 1.' }),
                makeEntry({ title: 'Doc 2', content: bigContent, summary: 'Summary of doc 2.' }),
            ]);
            expect(result).toContain('[Knowledge: Doc 1]');
            expect(result).toContain('[Knowledge: Doc 2]');
            expect(result).toContain('Summary of doc 1.');
            expect(result).toContain('Summary of doc 2.');
        });
    });

    describe('prompt-aware relevance ranking', () => {
        const entries = [
            makeEntry({ title: 'Cooking Recipes', content: 'How to make pasta and bread.' }),
            makeEntry({ title: 'Machine Learning', content: 'Neural networks and classification.' }),
            makeEntry({ title: 'Budget Report', content: 'Q4 financial data and revenue.' }),
        ];

        it('ranks most relevant entry first when prompt is provided', () => {
            const result = buildHierarchicalKBContext(entries, 'neural network classification');
            const mlIndex = result.indexOf('Machine Learning');
            const cookIndex = result.indexOf('Cooking Recipes');
            expect(mlIndex).toBeLessThan(cookIndex);
        });

        it('preserves original order when no prompt is given', () => {
            const result = buildHierarchicalKBContext(entries);
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });

        it('preserves original order when prompt is empty string', () => {
            const result = buildHierarchicalKBContext(entries, '');
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });
    });

    describe('dynamic token budgets by generation type', () => {
        function makeSizedEntry(name: string, charCount: number): KnowledgeBankEntry {
            const overhead = `[Knowledge: ${name}]\n`.length;
            return makeEntry({ title: name, content: 'x'.repeat(Math.max(0, charCount - overhead)) });
        }

        it('uses 12K token budget for single generation type', () => {
            const entries = [makeSizedEntry('A', 20_000), makeSizedEntry('B', 20_000)];
            const result = buildHierarchicalKBContext(entries, undefined, 'single');
            expect(result).toContain('[Knowledge: A]');
            expect(result).toContain('[Knowledge: B]');
        });

        it('uses 4K token budget for chain generation type', () => {
            const entries = [makeSizedEntry('Big', 20_000)];
            const result = buildHierarchicalKBContext(entries, undefined, 'chain');
            expect(result).toBe('');
        });

        it('uses 3K token budget for transform generation type', () => {
            const entries = [makeSizedEntry('Big', 15_000)];
            const result = buildHierarchicalKBContext(entries, undefined, 'transform');
            expect(result).toBe('');
        });

        it('uses default 8K budget when no generation type provided', () => {
            const entries = [makeSizedEntry('Fits', 30_000)];
            const result = buildHierarchicalKBContext(entries);
            expect(result).toContain('[Knowledge: Fits]');
        });

        it('chain budget truncates earlier than single budget', () => {
            const entries = [makeSizedEntry('Medium', 18_000)];
            const singleResult = buildHierarchicalKBContext(entries, undefined, 'single');
            const chainResult = buildHierarchicalKBContext(entries, undefined, 'chain');
            expect(singleResult).toContain('[Knowledge: Medium]');
            expect(chainResult).toBe('');
        });

        it('exports KB_TOKEN_BUDGETS with correct values', () => {
            expect(KB_TOKEN_BUDGETS.single).toBe(12_000);
            expect(KB_TOKEN_BUDGETS.chain).toBe(4_000);
            expect(KB_TOKEN_BUDGETS.transform).toBe(3_000);
        });
    });

    describe('pinned entries priority', () => {
        it('places pinned entries before unpinned regardless of relevance', () => {
            const entries = [
                makeEntry({ title: 'Unpinned ML', content: 'Machine learning neural networks.', pinned: false }),
                makeEntry({ title: 'Pinned Cooking', content: 'How to make pasta.', pinned: true }),
            ];
            const result = buildHierarchicalKBContext(entries, 'machine learning neural');
            const cookIdx = result.indexOf('Pinned Cooking');
            const mlIdx = result.indexOf('Unpinned ML');
            expect(cookIdx).toBeLessThan(mlIdx);
        });

        it('pinned entries consume budget first', () => {
            const pinnedEntry = makeEntry({
                title: 'Pinned Big', content: 'x'.repeat(11_950), pinned: true,
            });
            const unpinnedEntry = makeEntry({
                title: 'Unpinned Small', content: 'This should not fit in remaining budget.', pinned: false,
            });
            const result = buildHierarchicalKBContext([unpinnedEntry, pinnedEntry], undefined, 'transform');
            expect(result).toContain('Pinned Big');
            expect(result).not.toContain('Unpinned Small');
        });

        it('ranks unpinned entries by relevance after pinned', () => {
            const entries = [
                makeEntry({ title: 'Unpinned Finance', content: 'Q4 budget data.', pinned: false }),
                makeEntry({ title: 'Unpinned ML', content: 'Neural network classification.', pinned: false }),
                makeEntry({ title: 'Pinned Style', content: 'Use formal tone.', pinned: true }),
            ];
            const result = buildHierarchicalKBContext(entries, 'neural network');
            const styleIdx = result.indexOf('Pinned Style');
            const mlIdx = result.indexOf('Unpinned ML');
            const finIdx = result.indexOf('Unpinned Finance');
            expect(styleIdx).toBeLessThan(mlIdx);
            expect(mlIdx).toBeLessThan(finIdx);
        });
    });
});

describe('useKnowledgeBankContext selector stability', () => {
    it('returns a stable getKBContext reference across re-renders', () => {
        const { result, rerender } = renderHook(() => useKnowledgeBankContext());
        const first = result.current.getKBContext;
        rerender();
        const second = result.current.getKBContext;
        expect(second).toBe(first);
    });

    it('getKBContext reads fresh entries at call time (not stale closure)', async () => {
        const { useKnowledgeBankStore } = await import('../stores/knowledgeBankStore');
        useKnowledgeBankStore.setState({
            entries: [makeEntry({ id: '1', title: 'A', content: 'Alpha' })],
        });
        const { result } = renderHook(() => useKnowledgeBankContext());
        const ctx1 = result.current.getKBContext();
        expect(ctx1).toContain('Alpha');

        useKnowledgeBankStore.setState({
            entries: [makeEntry({ id: '2', title: 'B', content: 'Beta' })],
        });
        const ctx2 = result.current.getKBContext();
        expect(ctx2).toContain('Beta');
        expect(ctx2).not.toContain('Alpha');
    });
});
