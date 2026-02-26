import React from 'react';
import type { Editor } from '@tiptap/react';
import {
    EditingContent, GeneratingContent, AICardContent, SimpleCardContent, PlaceholderContent,
} from './IdeaCardContent';
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

export interface IdeaCardContentSectionProps {
    contentRef: React.Ref<HTMLDivElement>;
    selected: boolean | undefined;
    isEditing: boolean;
    onKeyDown: ((e: React.KeyboardEvent) => void) | undefined;
    isGenerating: boolean;
    hasContent: boolean;
    isAICard: boolean;
    heading: string | undefined;
    prompt: string;
    editor: Editor | null;
    handleDoubleClick: () => void;
    linkPreviews: IdeaNodeData['linkPreviews'];
}

interface RenderContentProps {
    isEditing: boolean;
    isGenerating: boolean;
    hasContent: boolean;
    isAICard: boolean;
    heading: string | undefined;
    prompt: string;
    editor: Editor | null;
    handleDoubleClick: () => void;
    linkPreviews: IdeaNodeData['linkPreviews'];
}

function renderContent(props: RenderContentProps): React.ReactElement {
    const { isEditing, isGenerating, hasContent, isAICard, heading, prompt, editor, handleDoubleClick, linkPreviews } = props;
    if (isEditing) return <EditingContent editor={editor} />;
    if (isGenerating) return <GeneratingContent />;
    if (hasContent && isAICard && !heading?.trim()) {
        return <AICardContent prompt={prompt} editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} />;
    }
    if (hasContent) return <SimpleCardContent editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} />;
    return <PlaceholderContent onDoubleClick={handleDoubleClick} />;
}

export const IdeaCardContentSection = React.memo((props: IdeaCardContentSectionProps) => {
    const { contentRef, selected, isEditing, onKeyDown, ...rest } = props;
    return (
        <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
            data-testid="content-area" ref={contentRef} tabIndex={selected || isEditing ? 0 : -1}
            onKeyDown={selected || isEditing ? onKeyDown : undefined}>
            {renderContent({ ...rest, isEditing })}
        </div>
    );
});
