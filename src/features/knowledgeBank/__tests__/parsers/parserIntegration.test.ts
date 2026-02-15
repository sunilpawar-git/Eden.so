/**
 * Parser Integration Tests — End-to-end flow through parser infrastructure
 * Verifies: file → registry → parser → ParseResult
 */
import { describe, it, expect, vi } from 'vitest';
import { kbParserRegistry } from '../../parsers/parserRegistry';

// Mock imageCompressor — Canvas API not available in jsdom
vi.mock('../../utils/imageCompressor', () => ({
    compressImage: vi.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' })),
}));

function createFile(content: string, name: string, type: string): File {
    return new File([content], name, { type });
}

describe('Parser Infrastructure Integration', () => {
    describe('Text file flow', () => {
        it('resolves and parses .txt file end-to-end', async () => {
            const file = createFile('Meeting notes here', 'meeting.txt', 'text/plain');
            const parser = kbParserRegistry.getParser(file);

            expect(parser).not.toBeNull();
            const result = await parser!.parse(file);

            expect(result.title).toBe('meeting');
            expect(result.content).toBe('Meeting notes here');
            expect(result.mimeType).toBe('text/plain');
            expect(result.originalFileName).toBe('meeting.txt');
            expect(result.chunks).toBeUndefined();
            expect(result.metadata?.requiresUpload).toBeUndefined();
        });

        it('resolves and parses .md file end-to-end', async () => {
            const file = createFile('# Title\n\nBody', 'readme.md', 'text/markdown');
            const parser = kbParserRegistry.getParser(file);

            expect(parser).not.toBeNull();
            const result = await parser!.parse(file);

            expect(result.content).toBe('# Title\n\nBody');
            expect(result.mimeType).toBe('text/markdown');
        });

        it('resolves and parses .json file end-to-end', async () => {
            const json = '{"name": "test"}';
            const file = createFile(json, 'data.json', 'application/json');
            const parser = kbParserRegistry.getParser(file);

            expect(parser).not.toBeNull();
            const result = await parser!.parse(file);
            expect(result.content).toBe(json);
        });
    });

    describe('Image file flow', () => {
        it('resolves and parses .png file end-to-end', async () => {
            const file = createFile('fake-png', 'photo.png', 'image/png');
            const parser = kbParserRegistry.getParser(file);

            expect(parser).not.toBeNull();
            const result = await parser!.parse(file);

            expect(result.title).toBe('photo');
            expect(result.metadata?.requiresUpload).toBe(true);
            expect(result.mimeType).toBe('image/jpeg'); // Compressed to JPEG
        });

        it('resolves and parses .jpeg file end-to-end', async () => {
            const file = createFile('fake-jpg', 'pic.jpeg', 'image/jpeg');
            const parser = kbParserRegistry.getParser(file);

            expect(parser).not.toBeNull();
            const result = await parser!.parse(file);
            expect(result.originalFileName).toBe('pic.jpeg');
        });
    });

    describe('DOCX file flow', () => {
        it('resolves a parser for .docx files by MIME type', () => {
            const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const file = createFile('fake-docx', 'report.docx', docxMime);
            const parser = kbParserRegistry.getParser(file);
            expect(parser).not.toBeNull();
        });

        it('resolves a parser for .docx files by extension fallback', () => {
            const file = createFile('fake-docx', 'report.docx', '');
            const parser = kbParserRegistry.getParser(file);
            expect(parser).not.toBeNull();
        });
    });

    describe('Unsupported file handling', () => {
        it('returns null for unknown file type', () => {
            const file = createFile('data', 'file.xyz', 'application/octet-stream');
            expect(kbParserRegistry.getParser(file)).toBeNull();
        });
    });

    describe('Extension listing', () => {
        it('lists all supported extensions', () => {
            const extensions = kbParserRegistry.getSupportedExtensions();
            // Text extensions
            expect(extensions).toContain('.txt');
            expect(extensions).toContain('.md');
            expect(extensions).toContain('.json');
            // Image extensions
            expect(extensions).toContain('.png');
            expect(extensions).toContain('.jpg');
            expect(extensions).toContain('.jpeg');
            // Document extensions
            expect(extensions).toContain('.pdf');
            expect(extensions).toContain('.docx');
        });

        it('lists all supported MIME types', () => {
            const mimeTypes = kbParserRegistry.getSupportedMimeTypes();
            expect(mimeTypes).toContain('text/plain');
            expect(mimeTypes).toContain('text/markdown');
            expect(mimeTypes).toContain('application/json');
            expect(mimeTypes).toContain('image/png');
            expect(mimeTypes).toContain('image/jpeg');
            expect(mimeTypes).toContain('application/pdf');
            expect(mimeTypes).toContain(
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );
        });
    });
});
