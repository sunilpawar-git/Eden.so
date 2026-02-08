/**
 * IdeaCardContent - Extracted content area sub-components
 * Reduces IdeaCard.tsx complexity by separating view state rendering
 */
import React from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { TipTapEditor } from './TipTapEditor';
import styles from './IdeaCard.module.css';

interface EditingContentProps {
    editor: Editor | null;
}

export const EditingContent = React.memo(({ editor }: EditingContentProps) => (
    <div className={styles.inputWrapper}>
        <TipTapEditor editor={editor} data-testid="tiptap-editor" />
    </div>
));

export const GeneratingContent = React.memo(() => (
    <div className={styles.generating}>
        <div className={styles.spinner} />
        <span>{strings.canvas.generating}</span>
    </div>
));

interface ViewContentProps {
    editor: Editor | null;
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

interface AICardContentProps extends ViewContentProps {
    prompt: string;
}

export const AICardContent = React.memo(({
    prompt, editor, onDoubleClick, onKeyDown,
}: AICardContentProps) => (
    <>
        <div
            className={styles.promptText}
            onDoubleClick={onDoubleClick}
            role="button"
            tabIndex={0}
            onKeyDown={onKeyDown}
        >
            {prompt}
        </div>
        <div
            className={styles.divider}
            data-testid="ai-divider"
            aria-label={strings.ideaCard.aiDividerLabel}
        />
        <TipTapEditor editor={editor} className={styles.outputContent} data-testid="view-editor" />
    </>
));

export const SimpleCardContent = React.memo(({
    editor, onDoubleClick, onKeyDown,
}: ViewContentProps) => (
    <div onDoubleClick={onDoubleClick} role="button" tabIndex={0} onKeyDown={onKeyDown}>
        <TipTapEditor editor={editor} className={styles.outputContent} data-testid="view-editor" />
    </div>
));

interface PlaceholderContentProps {
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const PlaceholderContent = React.memo(({
    onDoubleClick, onKeyDown,
}: PlaceholderContentProps) => (
    <div
        className={styles.placeholder}
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
    >
        {strings.ideaCard.inputPlaceholder}
    </div>
));
