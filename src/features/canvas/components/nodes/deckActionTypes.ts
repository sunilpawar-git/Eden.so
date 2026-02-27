/**
 * Shared types for Deck1Actions / Deck2Actions render functions.
 */
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import type { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';

export interface RenderContext {
    p: NodeUtilsBarProps;
    bar: ReturnType<typeof useNodeUtilsBar>;
    disabled: boolean;
    placement: 'right';
}
