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
const mockToastInfo = vi.mocked(toast.info);
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

    it('returns DocumentInsertResult with meta and parsedText on success', async () => {
        const file = makePdfFile();
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result).not.toBeNull();
        expect(result?.meta.filename).toBe('report.pdf');
        expect(result?.meta.url).toBe('https://cdn.example.com/doc.pdf');
        expect(result?.meta.thumbnailUrl).toBe('https://cdn.example.com/thumb.png');
        expect(result?.meta.parsedTextUrl).toBe('https://cdn.example.com/text.txt');
        expect(result?.meta.mimeType).toBe('application/pdf');
        expect(result?.meta.sizeBytes).toBe(1024);
    });

    it('parsedText matches parseDocument output', async () => {
        mockParse.mockResolvedValue({ text: 'Extracted PDF content' });
        const file = makePdfFile();
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result?.parsedText).toBe('Extracted PDF content');
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
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docFileTooLarge);
        expect(mockUploadFn).not.toHaveBeenCalled();
    });

    it('returns null and toasts error on parse failure', async () => {
        mockParse.mockRejectedValue(new Error(strings.canvas.docParsingFailed));
        const file = makePdfFile();
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docParsingFailed);
    });

    it('returns null and toasts generic error on unknown failure', async () => {
        mockUploadFn.mockRejectedValue(new Error('network glitch'));
        const file = makePdfFile();
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(strings.canvas.docUploadFailed);
    });

    it('does not show info toasts during successful upload (spinner handles feedback)', async () => {
        const file = makePdfFile();
        await processDocumentForNode(file, mockUploadFn);

        expect(mockToastInfo).not.toHaveBeenCalled();
    });

    it('handles text-only files without thumbnail', async () => {
        mockParse.mockResolvedValue({ text: 'CSV data here' });
        mockUploadFn.mockResolvedValue({
            documentUrl: 'https://cdn.example.com/data.csv',
            parsedTextUrl: 'https://cdn.example.com/data.txt',
        });
        const file = new File([new ArrayBuffer(100)], 'data.csv', { type: 'text/csv' });
        const result = await processDocumentForNode(file, mockUploadFn);

        expect(result?.meta.thumbnailUrl).toBeUndefined();
        expect(result?.meta.parsedTextUrl).toBe('https://cdn.example.com/data.txt');
        expect(result?.parsedText).toBe('CSV data here');
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
