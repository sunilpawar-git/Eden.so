/**
 * NodeUtilsBarAIOrTransform — AI Actions or TransformMenu slot for NodeUtilsBar.
 * Extracted for max-lines-per-function lint rule.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { TooltipButton } from './TooltipButton';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';

interface Props {
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
}

export const NodeUtilsBarAIOrTransform = React.memo(function NodeUtilsBarAIOrTransform(props: Props) {
    if (props.onTransform) {
        return (
            <TransformMenu
                onTransform={props.onTransform}
                isOpen={props.isTransformOpen}
                onToggle={props.onTransformToggle}
                onClose={props.onCloseSubmenu}
                onRegenerate={props.onRegenerate}
                disabled={props.disabled || !props.hasContent}
                isTransforming={props.isTransforming}
                tooltipPlacement={props.tooltipPlacement}
            />
        );
    }
    return (
        <TooltipButton
            label={strings.nodeUtils.aiActions}
            tooltipText={strings.nodeUtils.aiActions}
            icon="✨"
            onClick={props.onAIClick ?? (() => undefined)}
            disabled={props.disabled || !props.onAIClick}
            tooltipPlacement={props.tooltipPlacement}
        />
    );
});
