/**
 * FocusOverlay - Centered panel overlay for focused node editing
 * Renders via portal to escape ReactFlow transform context.
 * Reuses NodeHeading and TagInput for consistent editing UX.
 * ViewModel logic extracted to useFocusOverlayActions.
 */
import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { useFocusMode } from '../hooks/useFocusMode';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusOverlayActions } from '../hooks/useFocusOverlayActions';
import { normalizeNodeColorKey } from '../types/node';
import { NodeHeading } from './nodes/NodeHeading';
import { TagInput } from '@/features/tags';
import { TipTapEditor } from './nodes/TipTapEditor';
import { LinkPreviewList } from './nodes/LinkPreviewCard';
import styles from './FocusOverlay.module.css';

export const FocusOverlay = React.memo(function FocusOverlay() {
    const { focusedNode, isFocused, exitFocus } = useFocusMode();

    const nodeId = focusedNode?.id ?? '';
    const heading = focusedNode?.data.heading ?? '';
    const output = focusedNode?.data.output;
    const tagIds = focusedNode?.data.tags ?? [];
    const linkPreviews = focusedNode?.data.linkPreviews;
    const colorKey = normalizeNodeColorKey(focusedNode?.data.colorKey);
    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId && nodeId !== '');

    const { editor, handleDoubleClick, handleHeadingChange, handleTagsChange, saveBeforeExit } =
        useFocusOverlayActions({ nodeId, output, isEditing, onExit: exitFocus });

    const handleExit = useCallback(() => {
        saveBeforeExit();
        exitFocus();
    }, [saveBeforeExit, exitFocus]);

    const handlePanelClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); }, []);

    if (!isFocused || !focusedNode) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={strings.nodeUtils.focus}
            data-testid="focus-backdrop"
            className={styles.backdrop}
            onClick={handleExit}
        >
            <div data-testid="focus-panel" className={styles.panel} data-color={colorKey} onClick={handlePanelClick}>
                <button
                    data-testid="focus-close-button"
                    className={styles.closeButton}
                    onClick={handleExit}
                    aria-label={strings.nodeUtils.exitFocus}
                >
                    {strings.common.closeSymbol}
                </button>
                <div className={styles.headingSection}>
                    <NodeHeading
                        heading={heading}
                        isEditing={isEditing}
                        onHeadingChange={handleHeadingChange}
                        onDoubleClick={handleDoubleClick}
                    />
                </div>
                <div className={styles.divider} />
                <div className={styles.contentArea} data-testid="focus-content-area"
                    onDoubleClick={!isEditing ? handleDoubleClick : undefined}>
                    <TipTapEditor editor={editor} isEditable={isEditing} data-testid="focus-editor" />
                    <LinkPreviewList previews={linkPreviews ?? {}} />
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
