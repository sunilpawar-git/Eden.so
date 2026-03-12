/**
 * ContentMode Type Tests — TDD: Validates content mode type safety,
 * normalization, default handling, and backward compatibility.
 */
import { describe, it, expect } from 'vitest';
import {
    CONTENT_MODE_VALUES,
    DEFAULT_CONTENT_MODE,
    normalizeContentMode,
    isContentModeMindmap,
    type ContentMode,
} from '../contentMode';
import { createIdeaNode } from '../node';

describe('CONTENT_MODE_VALUES', () => {
    it('contains exactly "text" and "mindmap"', () => {
        expect(CONTENT_MODE_VALUES).toEqual(['text', 'mindmap']);
    });

    it('is a frozen array (immutable)', () => {
        expect(Object.isFrozen(CONTENT_MODE_VALUES)).toBe(true);
    });
});

describe('DEFAULT_CONTENT_MODE', () => {
    it('equals "text"', () => {
        expect(DEFAULT_CONTENT_MODE).toBe('text');
    });
});

describe('normalizeContentMode', () => {
    it('returns valid modes verbatim', () => {
        expect(normalizeContentMode('text')).toBe('text');
        expect(normalizeContentMode('mindmap')).toBe('mindmap');
    });

    it('defaults undefined to "text"', () => {
        expect(normalizeContentMode(undefined)).toBe('text');
    });

    it('defaults null to "text"', () => {
        expect(normalizeContentMode(null)).toBe('text');
    });

    it('defaults unknown strings to "text"', () => {
        expect(normalizeContentMode('diagram')).toBe('text');
        expect(normalizeContentMode('')).toBe('text');
        expect(normalizeContentMode('MINDMAP')).toBe('text');
    });

    it('defaults non-string values to "text"', () => {
        expect(normalizeContentMode(42)).toBe('text');
        expect(normalizeContentMode(true)).toBe('text');
        expect(normalizeContentMode({})).toBe('text');
    });
});

describe('isContentModeMindmap', () => {
    it('returns true for "mindmap"', () => {
        expect(isContentModeMindmap('mindmap')).toBe(true);
    });

    it('returns false for "text"', () => {
        expect(isContentModeMindmap('text')).toBe(false);
    });

    it('returns false for undefined (backward compat)', () => {
        expect(isContentModeMindmap(undefined)).toBe(false);
    });
});

describe('IdeaNodeData backward compatibility', () => {
    it('createIdeaNode produces no contentMode field (backward compat)', () => {
        const node = createIdeaNode('n1', 'ws-1', { x: 0, y: 0 });
        expect(node.data.contentMode).toBeUndefined();
    });

    it('contentMode is optional on IdeaNodeData (accepts undefined)', () => {
        const node = createIdeaNode('n1', 'ws-1', { x: 0, y: 0 });
        // Should type-check — contentMode is optional
        const mode: ContentMode | undefined = node.data.contentMode;
        expect(mode).toBeUndefined();
    });
});
