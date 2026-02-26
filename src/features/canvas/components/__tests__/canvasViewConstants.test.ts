import { describe, it, expect } from 'vitest';
import { MarkerType } from '@xyflow/react';
import {
    nodeTypes,
    edgeTypes,
    DEFAULT_EDGE_OPTIONS,
    DEFAULT_VIEWPORT,
    SNAP_GRID,
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
        it('has type deletable', () => {
            expect(DEFAULT_EDGE_OPTIONS.type).toBe('deletable');
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

        it('is readonly tuple type', () => {
            expect(SNAP_GRID[0]).toBe(16);
            expect(SNAP_GRID[1]).toBe(16);
        });
    });
});
