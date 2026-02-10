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
            Enter: () => ref.current?.onEnter() ?? false,
            Escape: () => ref.current?.onEscape() ?? false,
        };
    },
});
