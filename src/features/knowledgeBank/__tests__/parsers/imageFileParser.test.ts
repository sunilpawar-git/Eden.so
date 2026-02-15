/**
 * ImageFileParser Tests
 * Tests image parsing, compression, and AI description
 */
import { describe, it, expect, vi } from 'vitest';
import { ImageFileParser } from '../../parsers/imageFileParser';

// Mock imageCompressor — Canvas API not available in jsdom
vi.mock('../../utils/imageCompressor', () => ({
    compressImage: vi.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' })),
}));

// Mock image description service — Gemini API not available in tests
vi.mock('../../services/imageDescriptionService', () => ({
    describeImageWithAI: vi.fn().mockResolvedValue(
        'AI description: A chart showing quarterly revenue growth with bar graphs.'
    ),
}));

function createImageFile(name: string, type: string): File {
    return new File(['fake-image-data'], name, { type });
}

describe('ImageFileParser', () => {
    const parser = new ImageFileParser();

    describe('supportedMimeTypes', () => {
        it('supports image/png', () => {
            expect(parser.supportedMimeTypes).toContain('image/png');
        });

        it('supports image/jpeg', () => {
            expect(parser.supportedMimeTypes).toContain('image/jpeg');
        });
    });

    describe('supportedExtensions', () => {
        it('supports .png, .jpg, .jpeg', () => {
            expect(parser.supportedExtensions).toContain('.png');
            expect(parser.supportedExtensions).toContain('.jpg');
            expect(parser.supportedExtensions).toContain('.jpeg');
        });
    });

    describe('canParse', () => {
        it('returns true for image MIME types', () => {
            expect(parser.canParse(createImageFile('a.png', 'image/png'))).toBe(true);
            expect(parser.canParse(createImageFile('b.jpg', 'image/jpeg'))).toBe(true);
        });

        it('returns false for non-image MIME types', () => {
            const textFile = new File(['text'], 'doc.txt', { type: 'text/plain' });
            expect(parser.canParse(textFile)).toBe(false);
        });

        it('returns true for supported extension when MIME is empty', () => {
            expect(parser.canParse(createImageFile('photo.png', ''))).toBe(true);
            expect(parser.canParse(createImageFile('photo.jpg', ''))).toBe(true);
            expect(parser.canParse(createImageFile('photo.jpeg', ''))).toBe(true);
        });

        it('returns true for supported extension with wrong MIME type', () => {
            expect(parser.canParse(createImageFile('pic.jpg', 'application/octet-stream'))).toBe(true);
        });
    });

    describe('parse', () => {
        it('returns ParseResult with AI-generated description', async () => {
            const file = createImageFile('photo.png', 'image/png');
            const result = await parser.parse(file);

            expect(result.title).toBe('photo');
            expect(result.originalFileName).toBe('photo.png');
            expect(result.mimeType).toBe('image/jpeg');
            // Now uses Gemini Vision description
            expect(result.content).toContain('AI description');
        });

        it('marks result as requiring upload', async () => {
            const file = createImageFile('pic.jpg', 'image/jpeg');
            const result = await parser.parse(file);

            expect(result.metadata?.requiresUpload).toBe(true);
        });

        it('includes compressed blob in result', async () => {
            const file = createImageFile('pic.png', 'image/png');
            const result = await parser.parse(file);

            expect(result.blob).toBeInstanceOf(Blob);
        });

        it('content comes from AI description service', async () => {
            const file = createImageFile('diagram.jpeg', 'image/jpeg');
            const result = await parser.parse(file);

            // Content is now from Gemini Vision, not a placeholder
            expect(result.content).toContain('chart');
            expect(result.content).toContain('revenue');
        });

        it('strips extension from title', async () => {
            const file = createImageFile('my-photo.png', 'image/png');
            const result = await parser.parse(file);
            expect(result.title).toBe('my-photo');
        });

        it('does not include chunks', async () => {
            const file = createImageFile('img.png', 'image/png');
            const result = await parser.parse(file);
            expect(result.chunks).toBeUndefined();
        });
    });
});
