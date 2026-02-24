/**
 * useImageInsert Tests — Focus restoration, file picker, and progressive upload
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureEditorFocus, insertImageIntoEditor } from '../../services/imageInsertService';

function makeMockEditor(focused = true) {
    return {
        isDestroyed: false,
        isFocused: focused,
        state: {
            doc: {
                descendants: vi.fn(),
            },
            tr: {
                setNodeMarkup: vi.fn(),
                delete: vi.fn(),
            },
        },
        view: { dispatch: vi.fn() },
        commands: {
            focus: vi.fn(),
            setImage: vi.fn().mockReturnValue(true),
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

describe('ensureEditorFocus', () => {
    it('calls editor.commands.focus("end") when editor is not focused', () => {
        const editor = makeMockEditor(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        ensureEditorFocus(editor as any);
        expect(editor.commands.focus).toHaveBeenCalledWith('end');
    });

    it('does NOT call focus when editor is already focused', () => {
        const editor = makeMockEditor(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        ensureEditorFocus(editor as any);
        expect(editor.commands.focus).not.toHaveBeenCalled();
    });

    it('is a no-op when editor is null', () => {
        expect(() => ensureEditorFocus(null)).not.toThrow();
    });

    it('is a no-op when editor is destroyed', () => {
        const editor = makeMockEditor(false);
        editor.isDestroyed = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        ensureEditorFocus(editor as any);
        expect(editor.commands.focus).not.toHaveBeenCalled();
    });
});

describe('insertImageIntoEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls ensureEditorFocus before inserting', async () => {
        const editor = makeMockEditor(false);
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, uploadFn);

        expect(editor.commands.focus).toHaveBeenCalledWith('end');
    });

    it('inserts base64 then calls upload function', async () => {
        const editor = makeMockEditor(true);
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, uploadFn);

        expect(editor.chain).toHaveBeenCalled();
        expect(uploadFn).toHaveBeenCalledWith(file);
    });

    it('is a no-op when editor is null', async () => {
        const uploadFn = vi.fn();
        await insertImageIntoEditor(null, new File([], 'x.png'), uploadFn);
        expect(uploadFn).not.toHaveBeenCalled();
    });

    it('threads onAfterInsert callback to insertImageIntoEditor', async () => {
        const editor = makeMockEditor(true);
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const onAfterInsert = vi.fn();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
        await insertImageIntoEditor(editor as any, file, uploadFn, onAfterInsert);

        expect(onAfterInsert).toHaveBeenCalledOnce();
    });
});
