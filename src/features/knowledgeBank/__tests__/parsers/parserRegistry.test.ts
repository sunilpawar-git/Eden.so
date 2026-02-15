/**
 * ParserRegistry Tests — TDD RED phase
 * Tests for parser registration, resolution, and extension listing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ParserRegistry } from '../../parsers/parserRegistry';
import type { FileParser, ParseResult } from '../../parsers/types';

/** Minimal mock parser for testing registry behavior */
function createMockParser(
    mimeTypes: string[],
    extensions: string[]
): FileParser {
    return {
        supportedMimeTypes: mimeTypes,
        supportedExtensions: extensions,
        canParse: (file: File) => mimeTypes.includes(file.type),
        parse: async (file: File): Promise<ParseResult> => ({
            title: file.name,
            content: 'mock content',
            mimeType: file.type,
            originalFileName: file.name,
        }),
    };
}

function createMockFile(name: string, type: string): File {
    return new File(['test'], name, { type });
}

describe('ParserRegistry', () => {
    let registry: ParserRegistry;

    beforeEach(() => {
        registry = new ParserRegistry();
    });

    describe('register', () => {
        it('registers a parser without error', () => {
            const parser = createMockParser(['text/plain'], ['.txt']);
            expect(() => registry.register(parser)).not.toThrow();
        });
    });

    describe('getParser', () => {
        it('resolves parser by MIME type', () => {
            const parser = createMockParser(['text/plain'], ['.txt']);
            registry.register(parser);

            const file = createMockFile('test.txt', 'text/plain');
            expect(registry.getParser(file)).toBe(parser);
        });

        it('returns null for unregistered MIME type', () => {
            const file = createMockFile('test.pdf', 'application/pdf');
            expect(registry.getParser(file)).toBeNull();
        });

        it('resolves correct parser when multiple are registered', () => {
            const textParser = createMockParser(['text/plain'], ['.txt']);
            const imageParser = createMockParser(['image/png'], ['.png']);
            registry.register(textParser);
            registry.register(imageParser);

            const textFile = createMockFile('doc.txt', 'text/plain');
            const imageFile = createMockFile('pic.png', 'image/png');

            expect(registry.getParser(textFile)).toBe(textParser);
            expect(registry.getParser(imageFile)).toBe(imageParser);
        });

        it('resolves parser that handles multiple MIME types', () => {
            const parser = createMockParser(
                ['text/plain', 'text/markdown', 'application/json'],
                ['.txt', '.md', '.json']
            );
            registry.register(parser);

            expect(registry.getParser(createMockFile('a.txt', 'text/plain'))).toBe(parser);
            expect(registry.getParser(createMockFile('b.md', 'text/markdown'))).toBe(parser);
            expect(registry.getParser(createMockFile('c.json', 'application/json'))).toBe(parser);
        });
    });

    describe('getSupportedExtensions', () => {
        it('returns empty array when no parsers registered', () => {
            expect(registry.getSupportedExtensions()).toEqual([]);
        });

        it('returns all extensions from registered parsers', () => {
            registry.register(createMockParser(['text/plain'], ['.txt', '.md']));
            registry.register(createMockParser(['image/png'], ['.png']));

            const extensions = registry.getSupportedExtensions();
            expect(extensions).toContain('.txt');
            expect(extensions).toContain('.md');
            expect(extensions).toContain('.png');
            expect(extensions).toHaveLength(3);
        });

        it('deduplicates extensions', () => {
            registry.register(createMockParser(['text/plain'], ['.txt']));
            registry.register(createMockParser(['text/markdown'], ['.txt']));

            expect(registry.getSupportedExtensions()).toEqual(['.txt']);
        });
    });

    describe('getSupportedMimeTypes', () => {
        it('returns all MIME types from registered parsers', () => {
            registry.register(createMockParser(['text/plain'], ['.txt']));
            registry.register(createMockParser(['image/png'], ['.png']));

            const mimeTypes = registry.getSupportedMimeTypes();
            expect(mimeTypes).toContain('text/plain');
            expect(mimeTypes).toContain('image/png');
        });
    });
});
