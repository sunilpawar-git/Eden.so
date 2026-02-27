/**
 * TransformMenu configuration — SSOT for AI transformation options.
 */
import type { strings } from '@/shared/localization/strings';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';

export interface TransformOption {
    type: TransformationType;
    labelKey: keyof typeof strings.transformations;
}

export const TRANSFORM_OPTIONS: readonly TransformOption[] = [
    { type: 'refine', labelKey: 'refine' },
    { type: 'shorten', labelKey: 'shorten' },
    { type: 'lengthen', labelKey: 'lengthen' },
    { type: 'proofread', labelKey: 'proofread' },
];
