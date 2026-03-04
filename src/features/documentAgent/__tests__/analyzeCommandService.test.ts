/**
 * Analyze Command Service Tests — /analyze slash command logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { strings } from '@/shared/localization/strings';
import type { AttachmentMeta } from '@/features/canvas/types/document';

const mockGetText = vi.fn();

vi.mock('@/features/ai/services/attachmentTextCache', () => ({
    attachmentTextCache: { getText: (...args: unknown[]) => mockGetText(...args) },
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import {
    findAnalyzableAttachment,
    resolveAnalyzeCommand,
    checkExtractionCache,
} from '../services/analyzeCommandService';
/* eslint-enable import-x/first */

const validAttachment: AttachmentMeta = {
    filename: 'report.pdf',
    url: 'https://storage.example.com/report.pdf',
    parsedTextUrl: 'https://storage.example.com/report.txt',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
};

describe('findAnalyzableAttachment', () => {
    it('returns null for undefined attachments', () => {
        expect(findAnalyzableAttachment(undefined)).toBeNull();
    });

    it('returns null for empty array', () => {
        expect(findAnalyzableAttachment([])).toBeNull();
    });

    it('returns null when no attachment has parsedTextUrl', () => {
        const att: AttachmentMeta = { ...validAttachment, parsedTextUrl: undefined };
        expect(findAnalyzableAttachment([att])).toBeNull();
    });

    it('returns the first attachment with parsedTextUrl', () => {
        const att2: AttachmentMeta = { ...validAttachment, filename: 'second.pdf' };
        expect(findAnalyzableAttachment([validAttachment, att2])?.filename).toBe('report.pdf');
    });
});

describe('checkExtractionCache', () => {
    it('returns false when no cache', () => {
        expect(checkExtractionCache(validAttachment)).toBe(false);
    });

    it('returns true when fresh cache exists', () => {
        const cached: AttachmentMeta = {
            ...validAttachment,
            extraction: {
                classification: 'invoice',
                confidence: 'high',
                summary: 'test',
                keyFacts: [],
                actionItems: [],
                questions: [],
                extendedFacts: [],
            },
            analyzedAt: Date.now(),
        };
        expect(checkExtractionCache(cached)).toBe(true);
    });
});

describe('resolveAnalyzeCommand', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns error when no attachments', async () => {
        const result = await resolveAnalyzeCommand(undefined);
        expect('error' in result).toBe(true);
        if ('error' in result) {
            expect(result.error).toBe(strings.documentAgent.noAttachment);
        }
    });

    it('returns error when parsedText fetch fails', async () => {
        mockGetText.mockResolvedValue('');

        const result = await resolveAnalyzeCommand([validAttachment]);
        expect('error' in result).toBe(true);
    });

    it('returns result with parsedText and filename on success', async () => {
        mockGetText.mockResolvedValue('Document text content here');

        const result = await resolveAnalyzeCommand([validAttachment]);
        expect('result' in result).toBe(true);
        if ('result' in result) {
            expect(result.result.parsedText).toBe('Document text content here');
            expect(result.result.filename).toBe('report.pdf');
            expect(result.result.isCached).toBe(false);
        }
    });

    it('marks result as cached when fresh extraction exists', async () => {
        mockGetText.mockResolvedValue('text');
        const cached: AttachmentMeta = {
            ...validAttachment,
            extraction: {
                classification: 'invoice',
                confidence: 'high',
                summary: 'cached',
                keyFacts: [],
                actionItems: [],
                questions: [],
                extendedFacts: [],
            },
            analyzedAt: Date.now(),
        };

        const result = await resolveAnalyzeCommand([cached]);
        expect('result' in result).toBe(true);
        if ('result' in result) {
            expect(result.result.isCached).toBe(true);
        }
    });
});
