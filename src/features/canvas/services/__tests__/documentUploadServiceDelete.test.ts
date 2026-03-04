/**
 * documentUploadService — deleteNodeAttachments tests
 * Validates that orphan Storage files are cleaned up on node deletion
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/storage before importing the module
vi.mock('firebase/storage', () => ({
    ref: vi.fn((_, path: string) => ({ path })),
    uploadBytes: vi.fn().mockResolvedValue(undefined),
    uploadString: vi.fn().mockResolvedValue(undefined),
    getDownloadURL: vi.fn().mockResolvedValue('https://cdn.example.com/file'),
    deleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/config/firebase', () => ({ storage: {} }));
vi.mock('@/shared/utils/sanitize', () => ({ sanitizeFilename: (f: string) => f }));
vi.mock('@/shared/localization/strings', () => ({
    strings: { canvas: { docFileTooLarge: 'too large', docUnsupportedType: 'bad type', docMagicByteMismatch: 'bad bytes', docReadFailed: 'read failed' } },
}));

/* eslint-disable import-x/first */
import { deleteNodeAttachments } from '../documentUploadService';
import { deleteObject } from 'firebase/storage';
/* eslint-enable import-x/first */

const mockDeleteObject = vi.mocked(deleteObject);

function makeAttachment(url: string, thumbnailUrl?: string, parsedTextUrl?: string) {
    return {
        filename: 'test.pdf',
        url,
        thumbnailUrl,
        parsedTextUrl,
        mimeType: 'application/pdf' as const,
        sizeBytes: 1024,
    };
}

describe('deleteNodeAttachments', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('calls deleteObject for each attachment URL', async () => {
        const att = makeAttachment(
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf?alt=media&token=t',
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf.thumb.png?alt=media&token=t',
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf.parsed.txt?alt=media&token=t',
        );
        await deleteNodeAttachments([att]);
        expect(mockDeleteObject).toHaveBeenCalledTimes(3);
    });

    it('handles attachments without thumbnailUrl or parsedTextUrl', async () => {
        const att = makeAttachment(
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf?alt=media',
        );
        await deleteNodeAttachments([att]);
        expect(mockDeleteObject).toHaveBeenCalledTimes(1);
    });

    it('handles an empty attachments array without errors', async () => {
        await deleteNodeAttachments([]);
        expect(mockDeleteObject).not.toHaveBeenCalled();
    });

    it('skips URLs that do not match Firebase Storage pattern', async () => {
        const att = makeAttachment('https://example.com/not-storage/file.pdf');
        await deleteNodeAttachments([att]);
        // ref() is called but deleteObject should silently skip unparseable paths
        expect(mockDeleteObject).toHaveBeenCalledTimes(0);
    });

    it('continues deleting other files when one deleteObject fails', async () => {
        mockDeleteObject
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce(undefined);

        const att = makeAttachment(
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fa.pdf.thumb.png?alt=media',
        );
        await expect(deleteNodeAttachments([att])).resolves.not.toThrow();
        expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    });
});
