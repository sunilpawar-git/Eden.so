/**
 * getNodeMap — Memoized O(1) lookup map tests.
 * Verifies the map is derived from nodes array and recomputed only on reference change.
 */
import { describe, it, expect } from 'vitest';
import { getNodeMap } from '../canvasStore';
import { createIdeaNode } from '../../types/node';

describe('getNodeMap', () => {
    it('returns a Map with all nodes indexed by id', () => {
        const nodes = [
            createIdeaNode('a', 'w1', { x: 0, y: 0 }),
            createIdeaNode('b', 'w1', { x: 100, y: 0 }),
        ];
        const map = getNodeMap(nodes);
        expect(map.size).toBe(2);
        expect(map.get('a')).toBe(nodes[0]);
        expect(map.get('b')).toBe(nodes[1]);
    });

    it('returns undefined for non-existent ID', () => {
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];
        const map = getNodeMap(nodes);
        expect(map.get('nonexistent')).toBeUndefined();
    });

    it('returns same Map reference when called with same nodes array', () => {
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];
        const map1 = getNodeMap(nodes);
        const map2 = getNodeMap(nodes);
        expect(map2).toBe(map1);
    });

    it('rebuilds Map when nodes array reference changes', () => {
        const nodes1 = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];
        const map1 = getNodeMap(nodes1);

        const nodes2 = [...nodes1, createIdeaNode('b', 'w1', { x: 100, y: 0 })];
        const map2 = getNodeMap(nodes2);

        expect(map2).not.toBe(map1);
        expect(map2.size).toBe(2);
    });

    it('handles empty nodes array', () => {
        const map = getNodeMap([]);
        expect(map.size).toBe(0);
    });

    it('Map is ReadonlyMap (interface enforcement)', () => {
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];
        const map = getNodeMap(nodes);
        expect(map.get('a')).toBeDefined();
        expect(typeof map.get).toBe('function');
        expect(typeof map.has).toBe('function');
    });
});
