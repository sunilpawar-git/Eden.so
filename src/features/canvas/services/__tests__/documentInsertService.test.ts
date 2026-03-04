/**
 * Document Insert Service Tests — orchestration and error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { strings } from '@/shared/localization/strings';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

vi.mock('../documentParsingService', () => ({
    parseDocument: vi.fn(),
}));

vi.mock('../documentUploadService', () => ({
    validateDocumentFile: vi.fn(),
    dataUrlToBlob: vi.fn().mockReturnValue(new Blob(['thumb'], { type: 'image/png' })),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { processDocumentForNode, getDocumentErrorMessage } from '../documentInsertService';
import { parseDocument } from '../documentParsingService';
import { validateDocumentFile } from '../documentUploadService';
import { toast } from '@/shared/stores/toastStore';
/* eslint-enable import-x/first */

const mockParse = vi.mocked(parseDocument);
const mockValidate = vi.mocked(validateDocumentFile);
const mockToastError = vi.mocked(toast.error);

function makePdfFile(): File {
    return new File([new ArrayBuffer(1024)], 'report.pdf', { type: 'application/pdf' });
}

describe('processDocumentForNode', () => {
    const mockUploadFn = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockValidate.mockResolvedValue(undefined);
        mockParse.mockResolvedValue({ text: 'Hello world', thumbnailDataUrl: 'data:image/png;base64,AA==' });
        mockUploadFn.mockResolvedValue({
            documentUrl: 'https://cdn.example.com/doc.pdf',
            thumbnailUrl: 'https://cdn.example.com/thumb.png',
            parsedTextUrl: 'https://cdn.example.com/text.txt',
        });
    });

    it('returns AttachmentMeta on success', async () => {
        const file = makePdfFile();
        const meta = await processDocumentForNode(file, mockUploadFn);

        expect(meta).not.toBeNull();
        expect(meta?.filename).toBe('report.pdf');
        expect(meta?.url).toBe('https://cdn.example.com/doc.pdf');
        expect(meta?.thumbnailUrl).toBe('https://cdn.example.com/thumb.png');
        expect(meta?.parsedTextUrl).toBe('https://cdn.example.com/text.txt');
        expect(meta?.mimeType).toBe('application/pdf');
        expect(meta?.sizeBytes).toBe(1024);
    });

    it('calls validate, parse, then upload in sequence', async () => {
        const file = makePdfFile();
        await processDocumentForNode(file, mockUploadFn);

        expect(mockValidate).toHaveBeenCalledWith(file);
        expect(mockParse).toHaveBeenCalledWith(file);
        expect(mockUploadFn).toHaveBeenCalledTimes(1);
    });

    it('returns null and toasts error on validation failure', async () => {
        mockValidate.mockRejectedValue(new Error(strings.canvas.docFileTooLarge));
        const file = makePdfFile();
        const meta = await processDocumentForNode(file, mockUploadFn);

        expect(meta).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docFileTooLarge);
        expect(mockUploadFn).not.toHaveBeenCalled();
    });

    it('returns null and toasts error on parse failure', async () => {
        mockParse.mockRejectedValue(new Error(strings.canvas.docParsingFailed));
        const file = makePdfFile();
        const meta = await processDocumentForNode(file, mockUploadFn);

        expect(meta).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docParsingFailed);
    });

    it('returns null and toasts generic error on unknown failure', async () => {
        mockUploadFn.mockRejectedValue(new Error('network glitch'));
        const file = makePdfFile();
        const meta = await processDocumentForNode(file, mockUploadFn);

        expect(meta).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docUploadFailed);
    });

    it('handles text-only files without thumbnail', async () => {
        mockParse.mockResolvedValue({ text: 'CSV data here' });
        mockUploadFn.mockResolvedValue({
            documentUrl: 'https://cdn.example.com/data.csv',
            parsedTextUrl: 'https://cdn.example.com/data.txt',
        });
        const file = new File([new ArrayBuffer(100)], 'data.csv', { type: 'text/csv' });
        const meta = await processDocumentForNode(file, mockUploadFn);

        expect(meta?.thumbnailUrl).toBeUndefined();
        expect(meta?.parsedTextUrl).toBe('https://cdn.example.com/data.txt');
    });
});

describe('getDocumentErrorMessage', () => {
    it('returns known error messages as-is', () => {
        const err = new Error(strings.canvas.docFileTooLarge);
        expect(getDocumentErrorMessage(err)).toBe(strings.canvas.docFileTooLarge);
    });

    it('returns generic message for unknown errors', () => {
        expect(getDocumentErrorMessage(new Error('random'))).toBe(strings.canvas.docUploadFailed);
    });

    it('returns generic message for non-Error values', () => {
        expect(getDocumentErrorMessage('string error')).toBe(strings.canvas.docUploadFailed);
    });
});
