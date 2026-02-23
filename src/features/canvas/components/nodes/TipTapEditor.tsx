/**
 * TipTapEditor - Thin wrapper around TipTap's EditorContent
 * Provides consistent styling, testability, and BubbleMenu integration
 */
import { EditorContent, type Editor } from '@tiptap/react';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import styles from './TipTapEditor.module.css';

interface TipTapEditorProps {
    /** TipTap editor instance (null before initialization) */
    editor: Editor | null;
    /** Whether the editor is in editable mode (controls BubbleMenu visibility) */
    isEditable?: boolean;
    /** Additional CSS class name */
    className?: string;
    /** Test identifier */
    'data-testid'?: string;
}

export function TipTapEditor({
    editor,
    isEditable,
    className,
    'data-testid': testId,
}: TipTapEditorProps) {
    const combinedClassName = className
        ? `${styles.tiptapEditor} ${className}`
        : styles.tiptapEditor;

    const showBubbleMenu = isEditable ?? editor?.isEditable ?? false;

    return (
        <div className={combinedClassName} data-testid={testId}>
            <EditorContent editor={editor} />
            {editor && showBubbleMenu && <EditorBubbleMenu editor={editor} />}
        </div>
    );
}
