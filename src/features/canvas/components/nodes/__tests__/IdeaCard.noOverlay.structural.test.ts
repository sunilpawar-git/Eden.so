/**
 * Structural test: IdeaCard must NOT render a document upload overlay.
 * Upload feedback is handled by toast + inline AttachmentCardView spinner only.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ideaCardSrc = readFileSync(
    resolve(__dirname, '../IdeaCard.tsx'),
    'utf-8',
);

describe('IdeaCard — no upload overlay (structural)', () => {
    it('does not import IdeaCardUploadOverlay', () => {
        expect(ideaCardSrc).not.toContain('IdeaCardUploadOverlay');
    });

    it('does not reference isDocumentUploading', () => {
        expect(ideaCardSrc).not.toContain('isDocumentUploading');
    });
});
