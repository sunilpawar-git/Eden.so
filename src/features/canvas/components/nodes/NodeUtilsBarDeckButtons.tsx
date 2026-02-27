/**
 * NodeUtilsBarDeckButtons — Orchestrator that renders action buttons for a single deck.
 * Delegates rendering to Deck1Actions / Deck2Actions (SRP).
 * Memoized per CLAUDE.md performance rules.
 */
import React from 'react';
import { renderDeck1Action } from './Deck1Actions';
import { renderDeck2Action } from './Deck2Actions';
import type { UtilsBarActionId } from '../../types/utilsBarLayout';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import type { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import type { RenderContext } from './deckActionTypes';

interface DeckButtonsProps {
    actions: UtilsBarActionId[];
    props: NodeUtilsBarProps;
    bar: ReturnType<typeof useNodeUtilsBar>;
}

function renderAction(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
    return renderDeck1Action(id, ctx) ?? renderDeck2Action(id, ctx);
}

export const NodeUtilsBarDeckButtons = React.memo(function NodeUtilsBarDeckButtons({ actions, props, bar }: DeckButtonsProps) {
    const ctx: RenderContext = { p: props, bar, disabled: props.disabled ?? false, placement: 'right' };
    return <>{actions.map((id) => renderAction(id, ctx))}</>;
});
