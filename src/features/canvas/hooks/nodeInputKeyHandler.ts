import type { Editor } from '@tiptap/react';
import { GLOBAL_SHORTCUT_KEYS } from '@/shared/constants/shortcutKeys';

export type NodeShortcutMap = Record<string, () => void>;

export type ViewModeKeyAction =
    | { type: 'enter' }
    | { type: 'shortcut'; handler: () => void }
    | { type: 'skip' }
    | { type: 'print'; char: string }
    | null;

export function getViewModeKeyAction(
    e: KeyboardEvent,
    shortcuts?: NodeShortcutMap,
): ViewModeKeyAction {
    if (e.key === 'Enter') return { type: 'enter' };

    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!isPrintable) return null;

    if (shortcuts) {
        const handler = shortcuts[e.key.toLowerCase()];
        if (handler) return { type: 'shortcut', handler };
    }

    if (GLOBAL_SHORTCUT_KEYS.has(e.key.toLowerCase())) return { type: 'skip' };

    return { type: 'print', char: e.key };
}

export function applyViewModeKeyAction(
    action: ViewModeKeyAction,
    e: KeyboardEvent,
    ctx: { enterEditing: () => void; editor: Editor | null },
): void {
    if (!action) return;
    if (action.type === 'shortcut') {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
        return;
    }
    if (action.type === 'skip') return;

    e.preventDefault();
    e.stopPropagation();
    ctx.enterEditing();
    if (action.type === 'print') {
        const char = action.char;
        queueMicrotask(() => {
            if (!ctx.editor) return;
            const { state, dispatch } = ctx.editor.view;
            const { from, to } = state.selection;
            dispatch(state.tr.insertText(char, from, to));
        });
    }
}
