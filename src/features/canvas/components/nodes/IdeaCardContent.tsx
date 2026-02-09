/**
 * IdeaCardContent - Extracted content area sub-components
 * Reduces IdeaCard.tsx complexity by separating view state rendering
 */
import React from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import type { LinkPreviewMetadata } from '../../types/node';
import { TipTapEditor } from './TipTapEditor';
import { LinkPreviewList } from './LinkPreviewCard';
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
    linkPreviews?: Record<string, LinkPreviewMetadata>;
}

interface AICardContentProps extends ViewContentProps {
    prompt: string;
}

export const AICardContent = React.memo(({
    prompt, editor, onDoubleClick, linkPreviews,
}: AICardContentProps) => (
    <>
        <div
            className={styles.promptText}
            onDoubleClick={onDoubleClick}
            role="button"
            tabIndex={0}
        >
            {prompt}
        </div>
        <div
            className={styles.divider}
            data-testid="ai-divider"
            aria-label={strings.ideaCard.aiDividerLabel}
        />
        <TipTapEditor editor={editor} className={styles.outputContent} data-testid="view-editor" />
        <LinkPreviewList previews={linkPreviews ?? {}} />
    </>
));

export const SimpleCardContent = React.memo(({
    editor, onDoubleClick, linkPreviews,
}: ViewContentProps) => (
    <div onDoubleClick={onDoubleClick} role="button" tabIndex={0}>
        <TipTapEditor editor={editor} className={styles.outputContent} data-testid="view-editor" />
        <LinkPreviewList previews={linkPreviews ?? {}} />
    </div>
));

interface PlaceholderContentProps {
    onDoubleClick: () => void;
}

export const PlaceholderContent = React.memo(({
    onDoubleClick,
}: PlaceholderContentProps) => (
    <div
        className={styles.placeholder}
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
    >
        {strings.ideaCard.inputPlaceholder}
    </div>
));
