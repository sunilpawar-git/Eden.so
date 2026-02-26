/**
 * NodeUtilsBarPrimaryButtons — Primary action buttons for NodeUtilsBar.
 * Transform/AI, Connect, Copy, Pin, Delete. Extracted for CLAUDE.md 100-line limit.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarAIOrTransform } from './NodeUtilsBarAIOrTransform';
import { TooltipButton } from './TooltipButton';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import buttonStyles from './TooltipButton.module.css';

export interface NodeUtilsBarPrimaryButtonsProps {
    onTransform?: (type: TransformationType) => void;
    isTransformOpen: boolean;
    onTransformToggle: () => void;
    onCloseSubmenu: () => void;
    onRegenerate?: () => void;
    disabled: boolean;
    hasContent: boolean;
    isTransforming: boolean;
    tooltipPlacement: 'left' | 'right';
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
    onPinToggle?: () => void;
    onDelete: () => void;
    isPinned: boolean;
}

export const NodeUtilsBarPrimaryButtons = React.memo(function NodeUtilsBarPrimaryButtons(props: NodeUtilsBarPrimaryButtonsProps) {
    const { tooltipPlacement, disabled, hasContent, onConnectClick, onCopyClick, onPinToggle, onDelete, isPinned } = props;
    return (
        <>
            <NodeUtilsBarAIOrTransform
                onTransform={props.onTransform}
                isTransformOpen={props.isTransformOpen}
                onTransformToggle={props.onTransformToggle}
                onCloseSubmenu={props.onCloseSubmenu}
                onRegenerate={props.onRegenerate}
                disabled={disabled}
                hasContent={hasContent}
                isTransforming={props.isTransforming}
                tooltipPlacement={tooltipPlacement}
                onAIClick={props.onAIClick}
            />
            <TooltipButton
                label={strings.nodeUtils.connect}
                tooltipText={strings.nodeUtils.connect}
                icon="🔗"
                onClick={onConnectClick}
                disabled={disabled}
                tooltipPlacement={tooltipPlacement}
            />
            {onCopyClick && (
                <TooltipButton
                    label={strings.nodeUtils.copy}
                    tooltipText={strings.nodeUtils.copy}
                    shortcut={strings.nodeUtils.copyShortcut}
                    icon="📋"
                    onClick={onCopyClick}
                    disabled={disabled || !hasContent}
                    tooltipPlacement={tooltipPlacement}
                />
            )}
            {onPinToggle && (
                <TooltipButton
                    label={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                    tooltipText={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                    icon={isPinned ? '📍' : '📌'}
                    onClick={onPinToggle}
                    disabled={disabled}
                    tooltipPlacement={tooltipPlacement}
                />
            )}
            <TooltipButton
                label={strings.nodeUtils.delete}
                tooltipText={strings.nodeUtils.delete}
                shortcut={strings.nodeUtils.deleteShortcut}
                icon="🗑️"
                onClick={onDelete}
                disabled={disabled}
                className={buttonStyles.deleteButton}
                tooltipPlacement={tooltipPlacement}
            />
        </>
    );
});
