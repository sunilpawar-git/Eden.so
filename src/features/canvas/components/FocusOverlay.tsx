/**
 * FocusOverlay - Centered panel overlay for focused node editing
 * Renders via portal to escape ReactFlow transform context.
 * Reuses NodeHeading and TagInput for consistent editing UX.
 */
import React, { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { useFocusMode } from '../hooks/useFocusMode';
import { useCanvasStore } from '../stores/canvasStore';
import { NodeHeading, type NodeHeadingHandle } from './nodes/NodeHeading';
import { TagInput } from '@/features/tags';
import { TipTapEditor } from './nodes/TipTapEditor';
import { useIdeaCardEditor } from '../hooks/useIdeaCardEditor';
import styles from './FocusOverlay.module.css';

export const FocusOverlay = React.memo(function FocusOverlay() {
    const { focusedNode, isFocused, exitFocus } = useFocusMode();
    const headingRef = useRef<NodeHeadingHandle>(null);

    const nodeId = focusedNode?.id ?? '';
    const heading = focusedNode?.data.heading ?? '';
    const output = focusedNode?.data.output;
    const tagIds = focusedNode?.data.tags ?? [];
    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId && nodeId !== '');

    const handleHeadingChange = useCallback((h: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeHeading(nodeId, h);
    }, [nodeId]);

    const handleTagsChange = useCallback((ids: string[]) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeTags(nodeId, ids);
    }, [nodeId]);

    const saveContent = useCallback((markdown: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeOutput(nodeId, markdown);
    }, [nodeId]);

    const getEditableContent = useCallback(() => output ?? '', [output]);

    const { editor } = useIdeaCardEditor({
        isEditing,
        output,
        getEditableContent,
        placeholder: strings.ideaCard.inputPlaceholder,
        saveContent,
        onExitEditing: useCallback(() => { useCanvasStore.getState().stopEditing(); }, []),
    });

    const handleBackdropClick = useCallback(() => { exitFocus(); }, [exitFocus]);

    const handlePanelClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!isFocused || !focusedNode) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={strings.nodeUtils.focus}
            data-testid="focus-backdrop"
            className={styles.backdrop}
            onClick={handleBackdropClick}
        >
            <div data-testid="focus-panel" className={styles.panel} onClick={handlePanelClick}>
                <button
                    data-testid="focus-close-button"
                    className={styles.closeButton}
                    onClick={handleBackdropClick}
                    aria-label={strings.nodeUtils.exitFocus}
                >
                    &times;
                </button>
                <div className={styles.headingSection}>
                    <NodeHeading
                        ref={headingRef}
                        heading={heading}
                        isEditing={isEditing}
                        onHeadingChange={handleHeadingChange}
                    />
                </div>
                <div className={styles.divider} />
                <div className={styles.contentArea}>
                    <TipTapEditor editor={editor} data-testid="focus-editor" />
                </div>
                {tagIds.length > 0 && (
                    <div className={styles.tagsSection}>
                        <TagInput selectedTagIds={tagIds} onChange={handleTagsChange} compact />
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
});
