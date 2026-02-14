/**
 * Knowledge Bank Context Builder Tests
 * TDD: Tests for buildKBContextBlock utility
 */
import { describe, it, expect } from 'vitest';
import { buildKBContextBlock } from '../hooks/useKnowledgeBankContext';

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
        // KB_MAX_CONTEXT_TOKENS = 3000, CHARS_PER_TOKEN = 4, so ~12000 chars max
        const bigContent = 'x'.repeat(11_950);
        const result = buildKBContextBlock([
            { title: 'Big', content: bigContent },
            { title: 'Should Be Excluded', content: 'This should not appear' },
        ]);
        expect(result).toContain('[Knowledge: Big]');
        expect(result).not.toContain('Should Be Excluded');
    });

    it('returns empty string if first entry alone exceeds budget', () => {
        const hugeContent = 'x'.repeat(13_000);
        const result = buildKBContextBlock([
            { title: 'Huge', content: hugeContent },
        ]);
        expect(result).toBe('');
    });
});
