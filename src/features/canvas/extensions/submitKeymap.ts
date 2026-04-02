/**
 * submitKeymap - TipTap extension for Enter/Escape key handling
 *
 * Intercepts Enter (submit) and Escape (exit) at the ProseMirror level
 * so they fire before StarterKit's default paragraph-creation behavior.
 * Uses a ref-based callback pattern so the handler always reads the
 * latest closure values without re-creating the extension.
 */
import { Extension } from '@tiptap/core';

export interface SubmitKeymapHandler {
    /** Called on Enter (no Shift). Return `true` to prevent default (new paragraph). */
    onEnter: () => boolean;
    /** Called on Escape. Return `true` to prevent default. */
    onEscape: () => boolean;
}

export interface SubmitKeymapOptions {
    /** Ref whose `.current` provides the latest key handlers */
    handlerRef: { current: SubmitKeymapHandler | null };
}

export const SubmitKeymap = Extension.create<SubmitKeymapOptions>({
    name: 'submitKeymap',

    // Ensure this runs before StarterKit's keymaps
    priority: 1000,

    addKeyboardShortcuts() {
        const ref = this.options.handlerRef;
        return {
            Enter: ({ editor }) => {
                // Fallback: if the cursor is in a paragraph containing only '---',
                // convert it to an HR regardless of the onEnter mode.  Handles the
                // case where the character-level input rule misfired (macOS IME,
                // composing events, fast-type race conditions).
                const { from } = editor.state.selection;
                const $pos = editor.state.doc.resolve(from);
                if ($pos.parent.isTextblock && $pos.parent.textContent === '---') {
                    const hrType = editor.schema.nodes.horizontalRule;
                    if (hrType) {
                        editor.view.dispatch(
                            editor.state.tr.replaceWith($pos.before(), $pos.after(), hrType.create()),
                        );
                        return true;
                    }
                }
                return ref.current?.onEnter() ?? false;
            },
            Escape: () => ref.current?.onEscape() ?? false,
        };
    },
});
