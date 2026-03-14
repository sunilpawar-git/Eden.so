import { describe, it, expect } from 'vitest';
import { MarkerType } from '@xyflow/react';
import {
    nodeTypes,
    edgeTypes,
    DEFAULT_EDGE_OPTIONS,
    DEFAULT_VIEWPORT,
    SNAP_GRID,
    EDGE_TYPE_DELETABLE,
    NO_DRAG_CLASS,
    PAN_ACTIVATION_KEY,
    MULTI_SELECT_KEY,
    BACKGROUND_GAP,
    BACKGROUND_DOT_SIZE,
    DEFAULT_INPUT_MODE,
    sourceHandleId,
    targetHandleId,
} from '../canvasViewConstants';
import { IdeaCard } from '../nodes/IdeaCard';
import { DeletableEdge } from '../edges/DeletableEdge';

describe('canvasViewConstants', () => {
    describe('nodeTypes', () => {
        it('has idea key mapping to IdeaCard', () => {
            expect(nodeTypes.idea).toBe(IdeaCard);
        });

        it('has only expected keys', () => {
            expect(Object.keys(nodeTypes)).toEqual(['idea']);
        });
    });

    describe('edgeTypes', () => {
        it('has deletable key mapping to DeletableEdge', () => {
            expect(edgeTypes.deletable).toBe(DeletableEdge);
        });

        it('has only expected keys', () => {
            expect(Object.keys(edgeTypes)).toEqual(['deletable']);
        });
    });

    describe('DEFAULT_EDGE_OPTIONS', () => {
        it('uses EDGE_TYPE_DELETABLE constant', () => {
            expect(DEFAULT_EDGE_OPTIONS.type).toBe(EDGE_TYPE_DELETABLE);
        });

        it('has ArrowClosed marker end', () => {
            expect(DEFAULT_EDGE_OPTIONS.markerEnd).toEqual({
                type: MarkerType.ArrowClosed,
            });
        });
    });

    describe('DEFAULT_VIEWPORT', () => {
        it('has x, y, zoom', () => {
            expect(DEFAULT_VIEWPORT).toEqual({ x: 32, y: 32, zoom: 1 });
        });
    });

    describe('SNAP_GRID', () => {
        it('is tuple of 16x16', () => {
            expect(SNAP_GRID).toEqual([16, 16]);
        });
    });

    describe('interaction constants', () => {
        it('NO_DRAG_CLASS is nodrag', () => {
            expect(NO_DRAG_CLASS).toBe('nodrag');
        });

        it('PAN_ACTIVATION_KEY is Space', () => {
            expect(PAN_ACTIVATION_KEY).toBe('Space');
        });

        it('MULTI_SELECT_KEY is Shift', () => {
            expect(MULTI_SELECT_KEY).toBe('Shift');
        });

        it('BACKGROUND_GAP is 16', () => {
            expect(BACKGROUND_GAP).toBe(16);
        });

        it('BACKGROUND_DOT_SIZE is 1', () => {
            expect(BACKGROUND_DOT_SIZE).toBe(1);
        });

        it('DEFAULT_INPUT_MODE is note', () => {
            expect(DEFAULT_INPUT_MODE).toBe('note');
        });
    });

    describe('handle ID helpers', () => {
        it('sourceHandleId returns nodeId-source', () => {
            expect(sourceHandleId('abc')).toBe('abc-source');
        });

        it('targetHandleId returns nodeId-target', () => {
            expect(targetHandleId('abc')).toBe('abc-target');
        });
    });
});
