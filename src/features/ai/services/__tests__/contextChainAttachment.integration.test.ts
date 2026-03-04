/**
 * Integration test: buildContextChain + attachmentTextCache + getBytes
 * Verifies the full flow from CanvasNode with attachments -> AI context string
 * containing the actual parsed document text.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildContextChain } from '../contextChainBuilder';
import type { CanvasNode } from '@/features/canvas/types/node';

const mockGetBytes = vi.fn();

vi.mock('firebase/storage', () => ({
    getBytes: (a: unknown, b?: unknown) => mockGetBytes(a, b) as Promise<ArrayBuffer>,
    ref: (_storage: unknown, path?: unknown) => ({ path }),
}));

vi.mock('@/config/firebase', () => ({
    storage: { app: { name: 'mock' } },
}));

vi.mock('@/features/canvas/services/storagePathUtils', () => ({
    storagePathFromDownloadUrl: (url: unknown) =>
        typeof url === 'string' && url.includes('/o/') ? 'mocked/path.txt' : null,
}));

function encode(text: string): ArrayBuffer {
    return new TextEncoder().encode(text).buffer;
}

function makeNode(
    id: string,
    heading: string,
    attachments?: CanvasNode['data']['attachments'],
): CanvasNode {
    return {
        id, workspaceId: 'ws-1', type: 'idea',
        position: { x: 0, y: 0 },
        data: { heading, attachments },
        createdAt: new Date(), updatedAt: new Date(),
    };
}

describe('buildContextChain attachment integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('includes [Attached Document] with parsed text when node has parsedTextUrl', async () => {
        mockGetBytes.mockResolvedValue(encode('Q1: What is leadership?\nQ2: Describe teamwork.'));

        const node = makeNode('n1', 'PDF Upload', [{
            filename: '20 Qs.pdf',
            url: 'https://firebasestorage.googleapis.com/v0/b/proj/o/doc.pdf?alt=media',
            parsedTextUrl: 'https://firebasestorage.googleapis.com/v0/b/proj/o/doc.pdf.parsed.txt?alt=media',
            mimeType: 'application/pdf',
            sizeBytes: 5000,
        }]);

        const result = await buildContextChain([node]);

        expect(result).toHaveLength(1);
        expect(result[0]).toContain('PDF Upload');
        expect(result[0]).toContain('[Attached Document]');
        expect(result[0]).toContain('Q1: What is leadership?');
        expect(result[0]).toContain('Q2: Describe teamwork.');
    });

    it('produces no [Attached Document] section when node has no attachments', async () => {
        const node = makeNode('n2', 'Plain Note');

        const result = await buildContextChain([node]);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('Plain Note');
        expect(result[0]).not.toContain('[Attached Document]');
        expect(mockGetBytes).not.toHaveBeenCalled();
    });

    it('produces no [Attached Document] when parsedTextUrl is undefined', async () => {
        const node = makeNode('n3', 'File Without Parse', [{
            filename: 'notes.csv',
            url: 'https://firebasestorage.googleapis.com/v0/b/proj/o/notes.csv?alt=media',
            parsedTextUrl: undefined,
            mimeType: 'text/csv',
            sizeBytes: 200,
        }]);

        const result = await buildContextChain([node]);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('File Without Parse');
        expect(result[0]).not.toContain('[Attached Document]');
        expect(mockGetBytes).not.toHaveBeenCalled();
    });

    it('handles getBytes failure gracefully (fail-open)', async () => {
        mockGetBytes.mockRejectedValue(new Error('Storage unavailable'));

        const node = makeNode('n4', 'Broken Upload', [{
            filename: 'broken.pdf',
            url: 'https://firebasestorage.googleapis.com/v0/b/proj/o/broken.pdf?alt=media',
            parsedTextUrl: 'https://firebasestorage.googleapis.com/v0/b/proj/o/broken.pdf.parsed.txt?alt=media',
            mimeType: 'application/pdf',
            sizeBytes: 1000,
        }]);

        const result = await buildContextChain([node]);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('Broken Upload');
        expect(result[0]).not.toContain('[Attached Document]');
    });
});
