/**
 * Document Parsing Service Tests — text extraction and error handling
 * PDF parsing is tested via mock (pdfjs-dist is heavy for unit tests).
 * Text/CSV parsing is tested with real FileReader.
 */
import { describe, it, expect, vi } from 'vitest';
import { strings } from '@/shared/localization/strings';

// Mock pdfjs-dist to avoid loading the full library in tests
const mockGetTextContent = vi.fn().mockResolvedValue({
    items: [{ str: 'Hello' }, { str: 'World' }],
});
const mockGetPage = vi.fn().mockResolvedValue({
    getTextContent: mockGetTextContent,
    getViewport: vi.fn().mockReturnValue({ width: 200, height: 300 }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
});
const mockGetDocument = vi.fn().mockReturnValue({
    promise: Promise.resolve({
        numPages: 2,
        getPage: mockGetPage,
    }),
});

vi.mock('pdfjs-dist', () => ({
    getDocument: (...args: unknown[]) => mockGetDocument(...args),
    GlobalWorkerOptions: { workerSrc: '' },
    version: '4.0.0',
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { parseDocument } from '../documentParsingService';

describe('parseDocument — text/plain', () => {
    it('extracts text from a plain text file', async () => {
        const file = new File(['Hello, world!'], 'notes.txt', { type: 'text/plain' });
        const result = await parseDocument(file);

        expect(result.text).toBe('Hello, world!');
        expect(result.thumbnailDataUrl).toBeUndefined();
    });

    it('extracts text from a CSV file', async () => {
        const csv = 'name,age\nAlice,30\nBob,25';
        const file = new File([csv], 'data.csv', { type: 'text/csv' });
        const result = await parseDocument(file);

        expect(result.text).toBe(csv);
        expect(result.thumbnailDataUrl).toBeUndefined();
    });

    it('handles empty text files', async () => {
        const file = new File([''], 'empty.txt', { type: 'text/plain' });
        const result = await parseDocument(file);

        expect(result.text).toBe('');
    });
});

describe('parseDocument — unsupported types', () => {
    it('throws for unsupported MIME types', async () => {
        const file = new File([new ArrayBuffer(100)], 'app.exe', { type: 'application/octet-stream' });
        await expect(parseDocument(file)).rejects.toThrow(strings.canvas.docUnsupportedType);
    });
});

describe('parseDocument — PDF (mocked pdfjs)', () => {
    it('extracts text from a mocked PDF', async () => {
        const file = new File([new ArrayBuffer(100)], 'report.pdf', { type: 'application/pdf' });

        // Mock OffscreenCanvas for thumbnail rendering
        const mockConvertToBlob = vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
        vi.stubGlobal('OffscreenCanvas', class {
            width = 0; height = 0;
            constructor(w: number, h: number) { this.width = w; this.height = h; }
            getContext() {
                return { fillRect: vi.fn(), drawImage: vi.fn() };
            }
            convertToBlob = mockConvertToBlob;
        });

        const result = await parseDocument(file);

        expect(result.text).toContain('Hello');
        expect(result.text).toContain('World');
        expect(mockGetDocument).toHaveBeenCalled();
        // 2 pages: page 1 for thumbnail + text, page 2 for text
        expect(mockGetPage).toHaveBeenCalledWith(1);
        expect(mockGetPage).toHaveBeenCalledWith(2);
        expect(result.thumbnailDataUrl).toBeDefined();

        vi.unstubAllGlobals();
    });
});
