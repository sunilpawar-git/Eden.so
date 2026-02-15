/**
 * ChunkingService Tests — TDD RED phase
 * Tests for document chunking logic
 */
import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../../services/chunkingService';
import { KB_CHUNK_THRESHOLD } from '../../types/knowledgeBank';

describe('chunkDocument', () => {
    describe('below threshold', () => {
        it('returns empty array when content is below threshold', () => {
            const chunks = chunkDocument('Short text', 'Doc Title');
            expect(chunks).toEqual([]);
        });

        it('returns empty array for exactly at threshold', () => {
            const content = 'x'.repeat(KB_CHUNK_THRESHOLD);
            const chunks = chunkDocument(content, 'Doc');
            expect(chunks).toEqual([]);
        });

        it('returns empty array for empty content', () => {
            expect(chunkDocument('', 'Empty')).toEqual([]);
        });
    });

    describe('above threshold', () => {
        it('splits content into chunks', () => {
            const content = 'a'.repeat(KB_CHUNK_THRESHOLD + 1000);
            const chunks = chunkDocument(content, 'Big Doc');
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('each chunk is within threshold size', () => {
            const content = 'word '.repeat(3000); // ~15K chars
            const chunks = chunkDocument(content, 'Doc');
            for (const chunk of chunks) {
                expect(chunk.content.length).toBeLessThanOrEqual(KB_CHUNK_THRESHOLD);
            }
        });

        it('generates sequential titles', () => {
            const content = 'paragraph\n\n'.repeat(2000); // ~22K chars
            const chunks = chunkDocument(content, 'My PDF');
            expect(chunks[0]!.title).toContain('My PDF');
            expect(chunks[0]!.title).toContain('1');
            expect(chunks[1]!.title).toContain('My PDF');
            expect(chunks[1]!.title).toContain('2');
        });

        it('preserves all content across chunks', () => {
            const content = 'Hello World. '.repeat(1000); // ~13K chars
            const chunks = chunkDocument(content, 'Doc');
            // Join with space to account for trimmed boundary whitespace
            const reassembled = chunks.map((c) => c.content).join(' ');
            // Allow minor whitespace differences from boundary splitting
            expect(reassembled.replace(/\s+/g, ' ').trim())
                .toBe(content.replace(/\s+/g, ' ').trim());
        });

        it('assigns sequential index to each chunk', () => {
            const content = 'x'.repeat(KB_CHUNK_THRESHOLD * 3);
            const chunks = chunkDocument(content, 'Doc');
            chunks.forEach((chunk, i) => {
                expect(chunk.index).toBe(i);
            });
        });
    });

    describe('boundary splitting', () => {
        it('prefers splitting at paragraph boundaries', () => {
            const para1 = 'A'.repeat(4000);
            const para2 = 'B'.repeat(4000);
            const para3 = 'C'.repeat(4000);
            const content = `${para1}\n\n${para2}\n\n${para3}`;

            const chunks = chunkDocument(content, 'Doc');
            // Should split at \n\n boundaries, not mid-word
            expect(chunks.length).toBeGreaterThanOrEqual(2);
            // First chunk should contain only A's (plus trailing \n\n)
            const firstTrimmed = chunks[0]!.content.trim();
            expect(firstTrimmed.includes('C')).toBe(false);
        });

        it('falls back to sentence boundaries if no paragraphs', () => {
            const sentence = 'This is a test sentence. ';
            const content = sentence.repeat(500); // ~12.5K chars, no \n\n
            const chunks = chunkDocument(content, 'Doc');
            expect(chunks.length).toBeGreaterThan(1);
            // Each chunk should end with a period+space or be the last chunk
            for (let i = 0; i < chunks.length - 1; i++) {
                const c = chunks[i]!.content.trimEnd();
                expect(c.endsWith('.')).toBe(true);
            }
        });
    });
});
