import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockFile = vi.fn(() => ({ delete: mockDelete }));
const mockBucket = vi.fn(() => ({ file: mockFile }));

vi.mock('firebase-admin/storage', () => ({
    getStorage: () => ({ bucket: mockBucket }),
}));

vi.mock('firebase-admin/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase-functions/v2', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('firebase-functions/v2/firestore', () => ({
    onDocumentDeleted: (_path: string, handler: Function) => handler,
}));

import { onNodeDeleted } from '../onNodeDeleted.js';

const MOCK_URL = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fimg.png?alt=media';

describe('onNodeDeleted', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deletes Storage files referenced in node data', async () => {
        const event = {
            data: {
                data: () => ({
                    data: { output: `Some text with ${MOCK_URL} image` },
                }),
            },
            params: { userId: 'u1', workspaceId: 'ws1', nodeId: 'n1' },
        };

        await (onNodeDeleted as Function)(event);
        expect(mockFile).toHaveBeenCalledWith('users/u1/img.png');
        expect(mockDelete).toHaveBeenCalled();
    });

    it('deletes Storage files from attachments', async () => {
        const event = {
            data: {
                data: () => ({
                    data: {
                        output: 'text',
                        attachments: [{ url: MOCK_URL, thumbnailUrl: undefined }],
                    },
                }),
            },
            params: { userId: 'u1', workspaceId: 'ws1', nodeId: 'n1' },
        };

        await (onNodeDeleted as Function)(event);
        expect(mockFile).toHaveBeenCalled();
    });

    it('does nothing when node has no data', async () => {
        const event = {
            data: { data: () => ({}) },
            params: { userId: 'u1', workspaceId: 'ws1', nodeId: 'n1' },
        };

        await (onNodeDeleted as Function)(event);
        expect(mockFile).not.toHaveBeenCalled();
    });

    it('does nothing when node data has no storage URLs', async () => {
        const event = {
            data: {
                data: () => ({ data: { output: 'plain text' } }),
            },
            params: { userId: 'u1', workspaceId: 'ws1', nodeId: 'n1' },
        };

        await (onNodeDeleted as Function)(event);
        expect(mockFile).not.toHaveBeenCalled();
    });
});
