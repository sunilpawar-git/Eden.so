/**
 * TextFileParser Tests — TDD RED phase
 * Tests for text file parsing (.txt, .md, .json)
 */
import { describe, it, expect } from 'vitest';
import { TextFileParser } from '../../parsers/textFileParser';
import type { ParseResult } from '../../parsers/types';

function createTextFile(content: string, name: string, type: string): File {
    return new File([content], name, { type });
}

describe('TextFileParser', () => {
    const parser = new TextFileParser();

    describe('supportedMimeTypes', () => {
        it('supports text/plain', () => {
            expect(parser.supportedMimeTypes).toContain('text/plain');
        });

        it('supports text/markdown', () => {
            expect(parser.supportedMimeTypes).toContain('text/markdown');
        });

        it('supports application/json', () => {
            expect(parser.supportedMimeTypes).toContain('application/json');
        });
    });

    describe('supportedExtensions', () => {
        it('supports .txt, .md, .json', () => {
            expect(parser.supportedExtensions).toContain('.txt');
            expect(parser.supportedExtensions).toContain('.md');
            expect(parser.supportedExtensions).toContain('.json');
        });
    });

    describe('canParse', () => {
        it('returns true for supported MIME types', () => {
            expect(parser.canParse(createTextFile('', 'a.txt', 'text/plain'))).toBe(true);
            expect(parser.canParse(createTextFile('', 'b.md', 'text/markdown'))).toBe(true);
            expect(parser.canParse(createTextFile('', 'c.json', 'application/json'))).toBe(true);
        });

        it('returns false for unsupported MIME types', () => {
            expect(parser.canParse(createTextFile('', 'a.pdf', 'application/pdf'))).toBe(false);
            expect(parser.canParse(createTextFile('', 'b.png', 'image/png'))).toBe(false);
        });

        it('returns true for supported extension when MIME is empty', () => {
            expect(parser.canParse(createTextFile('', 'notes.txt', ''))).toBe(true);
            expect(parser.canParse(createTextFile('', 'readme.md', ''))).toBe(true);
            expect(parser.canParse(createTextFile('', 'data.json', ''))).toBe(true);
        });

        it('returns true for supported extension with wrong MIME type', () => {
            expect(parser.canParse(createTextFile('', 'notes.txt', 'application/octet-stream'))).toBe(true);
        });
    });

    describe('parse', () => {
        it('extracts content from text file', async () => {
            const file = createTextFile('Hello world', 'notes.txt', 'text/plain');
            const result: ParseResult = await parser.parse(file);

            expect(result.content).toBe('Hello world');
            expect(result.title).toBe('notes');
            expect(result.mimeType).toBe('text/plain');
            expect(result.originalFileName).toBe('notes.txt');
        });

        it('strips file extension from title', async () => {
            const file = createTextFile('data', 'my-doc.md', 'text/markdown');
            const result = await parser.parse(file);
            expect(result.title).toBe('my-doc');
        });

        it('handles JSON files', async () => {
            const json = JSON.stringify({ key: 'value' });
            const file = createTextFile(json, 'config.json', 'application/json');
            const result = await parser.parse(file);
            expect(result.content).toBe(json);
        });

        it('sanitizes HTML from content', async () => {
            const file = createTextFile(
                '<script>alert("xss")</script>Clean text',
                'evil.txt',
                'text/plain'
            );
            const result = await parser.parse(file);
            expect(result.content).not.toContain('<script>');
            expect(result.content).toContain('Clean text');
        });

        it('does not include chunks for text files', async () => {
            const file = createTextFile('Short text', 'a.txt', 'text/plain');
            const result = await parser.parse(file);
            expect(result.chunks).toBeUndefined();
        });

        it('preserves markdown formatting', async () => {
            const md = '# Heading\n\n- Item 1\n- Item 2';
            const file = createTextFile(md, 'doc.md', 'text/markdown');
            const result = await parser.parse(file);
            expect(result.content).toBe(md);
        });
    });
});
