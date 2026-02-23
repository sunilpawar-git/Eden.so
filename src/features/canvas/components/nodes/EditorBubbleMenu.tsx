/**
 * EditorBubbleMenu - Floating formatting toolbar on text selection
 * Renders Bold, Italic, Strikethrough, Code toggle buttons via TipTap BubbleMenu
 */
import React, { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import styles from './EditorBubbleMenu.module.css';

interface EditorBubbleMenuProps {
    editor: Editor | null;
}

type FormatAction = (editor: Editor) => void;

const FORMATS: ReadonlyArray<{
    key: string;
    label: string;
    display: string;
    action: FormatAction;
}> = [
    { key: 'bold', label: strings.formatting.bold, display: strings.formatting.boldDisplay, action: (e) => e.chain().focus().toggleBold().run() },
    { key: 'italic', label: strings.formatting.italic, display: strings.formatting.italicDisplay, action: (e) => e.chain().focus().toggleItalic().run() },
    { key: 'strike', label: strings.formatting.strikethrough, display: strings.formatting.strikethroughDisplay, action: (e) => e.chain().focus().toggleStrike().run() },
    { key: 'code', label: strings.formatting.code, display: strings.formatting.codeDisplay, action: (e) => e.chain().focus().toggleCode().run() },
];

export const EditorBubbleMenu = React.memo(function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    const handleFormat = useCallback(
        (e: React.MouseEvent, action: FormatAction) => {
            e.preventDefault();
            e.stopPropagation();
            if (!editor) return;
            action(editor);
        },
        [editor],
    );

    if (!editor) return null;

    return (
        <BubbleMenu editor={editor}>
            <div className={styles.toolbar}>
                {FORMATS.map(({ key, label, display, action }) => (
                    <button
                        key={key}
                        type="button"
                        aria-label={label}
                        className={`${styles.formatButton}${editor.isActive(key) ? ` ${styles.active}` : ''}`}
                        onMouseDown={(e) => handleFormat(e, action)}
                    >
                        {display}
                    </button>
                ))}
            </div>
        </BubbleMenu>
    );
});
