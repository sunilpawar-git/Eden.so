/**
 * Structural test: TipTapEditor must be rendered at a STABLE position
 * in the React tree inside IdeaCardContentSection — never nested
 * inside conditionally-rendered sub-components like EditingContent
 * or SimpleCardContent.
 *
 * If EditorContent unmounts during editing transitions, TipTap v3
 * clears all ReactNodeViewRenderer portals (attachment cards, etc.)
 * and the NodeView recreation race silently drops them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONTENT_SECTION = resolve(__dirname, '../IdeaCardContentSection.tsx');
const CONTENT_SUBS = resolve(__dirname, '../IdeaCardContent.tsx');

describe('TipTapEditor tree stability', () => {
    const sectionSrc = readFileSync(CONTENT_SECTION, 'utf-8');
    const subsSrc = readFileSync(CONTENT_SUBS, 'utf-8');

    it('IdeaCardContentSection renders TipTapEditor directly', () => {
        expect(sectionSrc).toContain('<TipTapEditor');
    });

    it('sub-components (IdeaCardContent.tsx) do NOT render TipTapEditor', () => {
        expect(subsSrc).not.toContain('<TipTapEditor');
    });

    it('IdeaCardContent.tsx does not import TipTapEditor', () => {
        expect(subsSrc).not.toMatch(/import.*TipTapEditor/);
    });
});
