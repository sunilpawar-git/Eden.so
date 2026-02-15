/**
 * PDF Integration Tests — End-to-end PDF → chunks → KB entries
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdfjs-dist (used via dynamic import in parser)
const mockGetDocument = vi.fn();
vi.mock('pdfjs-dist', () => ({
    getDocument: mockGetDocument,
    GlobalWorkerOptions: { workerSrc: '' },
    version: '5.0.0',
}));

// Mock Firebase
vi.mock('@/config/firebase', () => ({ db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => new Date()),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { useKnowledgeBankStore } from '../../stores/knowledgeBankStore';
// eslint-disable-next-line import-x/first
import { kbParserRegistry } from '../../parsers/parserRegistry';

function createMockPdfDoc(pageTexts: string[]) {
    const pages = pageTexts.map((text) => ({
        getTextContent: vi.fn().mockResolvedValue({
            items: text.split(' ').map((str) => ({ str, hasEOL: false })),
        }),
    }));
    return {
        promise: Promise.resolve({
            numPages: pages.length,
            getPage: vi.fn().mockImplementation((num: number) =>
                Promise.resolve(pages[num - 1])
            ),
        }),
    };
}

describe('PDF Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useKnowledgeBankStore.getState().clearEntries();
    });

    it('registry resolves PDF parser', () => {
        const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
        const parser = kbParserRegistry.getParser(file);
        expect(parser).not.toBeNull();
        expect(parser!.supportedMimeTypes).toContain('application/pdf');
    });

    it('parses small PDF into single ParseResult without chunks', async () => {
        mockGetDocument.mockReturnValue(
            createMockPdfDoc(['Brief content here'])
        );

        const file = new File(['fake'], 'notes.pdf', { type: 'application/pdf' });
        const parser = kbParserRegistry.getParser(file)!;
        const result = await parser.parse(file);

        expect(result.title).toBe('notes');
        expect(result.content).toContain('Brief');
        expect(result.chunks).toBeUndefined();
        expect(result.metadata?.pageCount).toBe('1');
    });

    it('parses large PDF into chunked ParseResult', async () => {
        const largeText = 'word '.repeat(2000);
        mockGetDocument.mockReturnValue(
            createMockPdfDoc([largeText, largeText])
        );

        const file = new File(['fake'], 'report.pdf', { type: 'application/pdf' });
        const parser = kbParserRegistry.getParser(file)!;
        const result = await parser.parse(file);

        expect(result.chunks).toBeDefined();
        expect(result.chunks!.length).toBeGreaterThan(1);

        for (const chunk of result.chunks!) {
            expect(chunk.title).toContain('report');
        }
    });

    it('supported extensions include .pdf', () => {
        const extensions = kbParserRegistry.getSupportedExtensions();
        expect(extensions).toContain('.pdf');
    });

    it('supported MIME types include application/pdf', () => {
        const mimeTypes = kbParserRegistry.getSupportedMimeTypes();
        expect(mimeTypes).toContain('application/pdf');
    });
});
