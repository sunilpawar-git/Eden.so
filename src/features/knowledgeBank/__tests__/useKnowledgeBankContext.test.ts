/**
 * Knowledge Bank Context Builder Tests
 * TDD: Tests for buildKBContextBlock utility (with summary + relevance support)
 * + Selector stability tests for useKnowledgeBankContext hook
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildKBContextBlock, useKnowledgeBankContext } from '../hooks/useKnowledgeBankContext';
import { KB_TOKEN_BUDGETS } from '../types/knowledgeBank';

describe('buildKBContextBlock', () => {
    it('returns empty string when no entries', () => {
        expect(buildKBContextBlock([])).toBe('');
    });

    it('formats single entry correctly', () => {
        const result = buildKBContextBlock([
            { title: 'Brand Voice', content: 'Professional and concise tone.' },
        ]);
        expect(result).toContain('--- Workspace Knowledge Bank ---');
        expect(result).toContain('[Knowledge: Brand Voice]');
        expect(result).toContain('Professional and concise tone.');
        expect(result).toContain('--- End Knowledge Bank ---');
    });

    it('formats multiple entries', () => {
        const result = buildKBContextBlock([
            { title: 'Style', content: 'Use bullet points.' },
            { title: 'Audience', content: 'Engineers and PMs.' },
        ]);
        expect(result).toContain('[Knowledge: Style]');
        expect(result).toContain('[Knowledge: Audience]');
    });

    it('truncates entries that exceed token budget', () => {
        // KB_MAX_CONTEXT_TOKENS = 8000, CHARS_PER_TOKEN = 4, so ~32000 chars max
        const bigContent = 'x'.repeat(31_950);
        const result = buildKBContextBlock([
            { title: 'Big', content: bigContent },
            { title: 'Should Be Excluded', content: 'This should not appear' },
        ]);
        expect(result).toContain('[Knowledge: Big]');
        expect(result).not.toContain('Should Be Excluded');
    });

    it('returns empty string if first entry alone exceeds budget', () => {
        // KB_MAX_CONTEXT_TOKENS = 8000, CHARS_PER_TOKEN = 4, so budget = 32000 chars
        const hugeContent = 'x'.repeat(33_000);
        const result = buildKBContextBlock([
            { title: 'Huge', content: hugeContent },
        ]);
        expect(result).toBe('');
    });

    describe('summary preference', () => {
        it('uses summary when available instead of content', () => {
            const result = buildKBContextBlock([
                {
                    title: 'Long Doc',
                    content: 'Very long content that is thousands of characters...',
                    summary: 'Concise summary of the long document.',
                },
            ]);
            expect(result).toContain('Concise summary of the long document.');
            expect(result).not.toContain('Very long content');
        });

        it('falls back to content when summary is undefined', () => {
            const result = buildKBContextBlock([
                { title: 'No Summary', content: 'Original content here.' },
            ]);
            expect(result).toContain('Original content here.');
        });

        it('fits more entries in budget when using summaries', () => {
            // Without summaries, only 1 entry fits. With summaries, both fit.
            const bigContent = 'x'.repeat(20_000);
            const result = buildKBContextBlock([
                { title: 'Doc 1', content: bigContent, summary: 'Summary of doc 1.' },
                { title: 'Doc 2', content: bigContent, summary: 'Summary of doc 2.' },
            ]);
            expect(result).toContain('[Knowledge: Doc 1]');
            expect(result).toContain('[Knowledge: Doc 2]');
            expect(result).toContain('Summary of doc 1.');
            expect(result).toContain('Summary of doc 2.');
        });
    });

    describe('prompt-aware relevance ranking', () => {
        const entries = [
            { title: 'Cooking Recipes', content: 'How to make pasta and bread.' },
            { title: 'Machine Learning', content: 'Neural networks and classification.' },
            { title: 'Budget Report', content: 'Q4 financial data and revenue.' },
        ];

        it('ranks most relevant entry first when prompt is provided', () => {
            const result = buildKBContextBlock(entries, 'neural network classification');
            const mlIndex = result.indexOf('Machine Learning');
            const cookIndex = result.indexOf('Cooking Recipes');
            expect(mlIndex).toBeLessThan(cookIndex);
        });

        it('preserves original order when no prompt is given', () => {
            const result = buildKBContextBlock(entries);
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });

        it('preserves original order when prompt is empty string', () => {
            const result = buildKBContextBlock(entries, '');
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });
    });

    describe('dynamic token budgets by generation type', () => {
        // CHARS_PER_TOKEN = 4, so budget in chars = tokens * 4
        // single: 12000 * 4 = 48000, chain: 4000 * 4 = 16000, transform: 3000 * 4 = 12000

        /** Create an entry whose block is approximately `charCount` chars */
        function makeEntry(name: string, charCount: number) {
            const overhead = `[Knowledge: ${name}]\n`.length;
            return { title: name, content: 'x'.repeat(Math.max(0, charCount - overhead)) };
        }

        it('uses 12K token budget for single generation type', () => {
            // 48000 chars budget; 2 entries of 20K each — both should fit
            const entries = [makeEntry('A', 20_000), makeEntry('B', 20_000)];
            const result = buildKBContextBlock(entries, undefined, 'single');
            expect(result).toContain('[Knowledge: A]');
            expect(result).toContain('[Knowledge: B]');
        });

        it('uses 4K token budget for chain generation type', () => {
            // 16000 chars budget; entry of 20K should NOT fit
            const entries = [makeEntry('Big', 20_000)];
            const result = buildKBContextBlock(entries, undefined, 'chain');
            expect(result).toBe('');
        });

        it('uses 3K token budget for transform generation type', () => {
            // 12000 chars budget; entry of 15K should NOT fit
            const entries = [makeEntry('Big', 15_000)];
            const result = buildKBContextBlock(entries, undefined, 'transform');
            expect(result).toBe('');
        });

        it('uses default 8K budget when no generation type provided', () => {
            // 32000 chars budget; entry of 30K should fit, but not 33K
            const entries = [makeEntry('Fits', 30_000)];
            const result = buildKBContextBlock(entries);
            expect(result).toContain('[Knowledge: Fits]');
        });

        it('chain budget truncates earlier than single budget', () => {
            // Entry of 18K chars: fits in single (48K), not in chain (16K)
            const entries = [makeEntry('Medium', 18_000)];
            const singleResult = buildKBContextBlock(entries, undefined, 'single');
            const chainResult = buildKBContextBlock(entries, undefined, 'chain');
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
                { title: 'Unpinned ML', content: 'Machine learning neural networks.', pinned: false },
                { title: 'Pinned Cooking', content: 'How to make pasta.', pinned: true },
            ];
            // Prompt favors ML, but pinned Cooking should come first
            const result = buildKBContextBlock(entries, 'machine learning neural');
            const cookIdx = result.indexOf('Pinned Cooking');
            const mlIdx = result.indexOf('Unpinned ML');
            expect(cookIdx).toBeLessThan(mlIdx);
        });

        it('pinned entries consume budget first', () => {
            // Use transform budget (3K tokens = 12K chars)
            // Pinned entry fills almost all budget, leaving no room for unpinned
            const pinnedEntry = {
                title: 'Pinned Big', content: 'x'.repeat(11_950), pinned: true,
            };
            const unpinnedEntry = {
                title: 'Unpinned Small', content: 'This should not fit in remaining budget.', pinned: false,
            };
            const result = buildKBContextBlock([unpinnedEntry, pinnedEntry], undefined, 'transform');
            expect(result).toContain('Pinned Big');
            expect(result).not.toContain('Unpinned Small');
        });

        it('ranks unpinned entries by relevance after pinned', () => {
            const entries = [
                { title: 'Unpinned Finance', content: 'Q4 budget data.', pinned: false },
                { title: 'Unpinned ML', content: 'Neural network classification.', pinned: false },
                { title: 'Pinned Style', content: 'Use formal tone.', pinned: true },
            ];
            const result = buildKBContextBlock(entries, 'neural network');
            const styleIdx = result.indexOf('Pinned Style');
            const mlIdx = result.indexOf('Unpinned ML');
            const finIdx = result.indexOf('Unpinned Finance');
            // Pinned first, then ML (relevant), then Finance
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
            entries: [{ id: '1', workspaceId: 'w1', title: 'A', content: 'Alpha', enabled: true, type: 'text' as const, createdAt: new Date(), updatedAt: new Date() }],
        });
        const { result } = renderHook(() => useKnowledgeBankContext());
        const ctx1 = result.current.getKBContext();
        expect(ctx1).toContain('Alpha');

        useKnowledgeBankStore.setState({
            entries: [{ id: '2', workspaceId: 'w1', title: 'B', content: 'Beta', enabled: true, type: 'text' as const, createdAt: new Date(), updatedAt: new Date() }],
        });
        const ctx2 = result.current.getKBContext();
        expect(ctx2).toContain('Beta');
        expect(ctx2).not.toContain('Alpha');
    });
});
