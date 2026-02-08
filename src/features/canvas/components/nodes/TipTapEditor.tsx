/**
 * TipTapEditor - Thin wrapper around TipTap's EditorContent
 * Provides consistent styling and testability
 */
import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import styles from './TipTapEditor.module.css';

interface TipTapEditorProps {
    /** TipTap editor instance (null before initialization) */
    editor: Editor | null;
    /** Additional CSS class name */
    className?: string;
    /** Test identifier */
    'data-testid'?: string;
}

export const TipTapEditor = React.memo(({
    editor,
    className,
    'data-testid': testId,
}: TipTapEditorProps) => {
    const combinedClassName = className
        ? `${styles.tiptapEditor} ${className}`
        : styles.tiptapEditor;

    return (
        <div className={combinedClassName} data-testid={testId}>
            <EditorContent editor={editor} />
        </div>
    );
});
