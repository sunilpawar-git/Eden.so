/**
 * Image Insert Service Tests — Security and edge cases
 */
import { describe, it, expect, vi } from 'vitest';
import { ensureEditorFocus, insertImageIntoEditor } from '../imageInsertService';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
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

describe('insertImageIntoEditor — error handling', () => {
    it('shows toast on upload failure', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        const editor = makeMockEditor(true);
        const failFn = vi.fn().mockRejectedValue(new Error('Network error'));
        const file = new File(['x'], 'fail.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, failFn);

        expect(toast.error).toHaveBeenCalled();
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
