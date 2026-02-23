/**
 * Image Insert Service Tests — Security and edge cases
 */
import { describe, it, expect, vi } from 'vitest';
import { ensureEditorFocus, insertImageIntoEditor } from '../imageInsertService';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

function makeMockEditor(focused = true, destroyed = false) {
    const nodes: Array<{ type: { name: string }; attrs: Record<string, string>; nodeSize: number }> = [];
    return {
        isDestroyed: destroyed,
        isFocused: focused,
        state: {
            doc: {
                descendants: (cb: (node: typeof nodes[0], pos: number) => void) => {
                    nodes.forEach((n, i) => cb(n, i));
                },
            },
            tr: {
                setNodeMarkup: vi.fn(),
                delete: vi.fn(),
            },
        },
        view: { dispatch: vi.fn() },
        commands: {
            focus: vi.fn(),
        },
        chain: vi.fn().mockReturnValue({
            focus: vi.fn().mockReturnValue({
                setImage: vi.fn().mockReturnValue({
                    run: vi.fn(),
                }),
            }),
        }),
    };
}

describe('ensureEditorFocus — edge cases', () => {
    it('does not throw when editor is destroyed', () => {
        const editor = makeMockEditor(false, true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        expect(() => ensureEditorFocus(editor as any)).not.toThrow();
        expect(editor.commands.focus).not.toHaveBeenCalled();
    });
});

describe('insertImageIntoEditor — upload feedback', () => {
    it('shows uploading toast when upload starts', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        const { strings } = await import('@/shared/localization/strings');
        vi.clearAllMocks();
        const editor = makeMockEditor(true);
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const file = new File(['x'], 'pic.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, uploadFn);

        expect(toast.info).toHaveBeenCalledWith(strings.canvas.imageUploading);
    });
});

describe('insertImageIntoEditor — error handling', () => {
    it('shows generic toast on unknown upload failure', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        const { strings } = await import('@/shared/localization/strings');
        const editor = makeMockEditor(true);
        const failFn = vi.fn().mockRejectedValue(new Error('Network error'));
        const file = new File(['x'], 'fail.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, failFn);

        expect(toast.error).toHaveBeenCalledWith(strings.canvas.imageUploadFailed);
    });

    it('surfaces specific error for oversized files', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        const { strings } = await import('@/shared/localization/strings');
        vi.clearAllMocks();
        const editor = makeMockEditor(true);
        const failFn = vi.fn().mockRejectedValue(new Error(strings.canvas.imageFileTooLarge));
        const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, failFn);

        expect(toast.error).toHaveBeenCalledWith(strings.canvas.imageFileTooLarge);
    });

    it('surfaces specific error for unsupported type', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        const { strings } = await import('@/shared/localization/strings');
        vi.clearAllMocks();
        const editor = makeMockEditor(true);
        const failFn = vi.fn().mockRejectedValue(new Error(strings.canvas.imageUnsupportedType));
        const file = new File(['x'], 'bad.svg', { type: 'image/svg+xml' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, failFn);

        expect(toast.error).toHaveBeenCalledWith(strings.canvas.imageUnsupportedType);
    });

    it('does nothing when editor is destroyed', async () => {
        const editor = makeMockEditor(true, true);
        const uploadFn = vi.fn();
        const file = new File(['x'], 'img.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, uploadFn);

        expect(uploadFn).not.toHaveBeenCalled();
    });
});
