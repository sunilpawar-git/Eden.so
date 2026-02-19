/**
 * Canvas Store Calendar Tests - TDD for setNodeCalendarEvent action
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CalendarEventMetadata } from '../types/calendarEvent';

const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: { heading: 'Test node' },
    position: { x: 0, y: 0 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockCalendarEvent: CalendarEventMetadata = {
    id: 'gcal-1',
    type: 'event',
    title: 'Team standup',
    date: '2026-02-20T10:00:00Z',
    endDate: '2026-02-20T10:30:00Z',
    status: 'synced',
    syncedAt: Date.now(),
    calendarId: 'primary',
};

describe('canvasStore.setNodeCalendarEvent', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [mockNode],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should set calendar event on a node', () => {
        useCanvasStore.getState().setNodeCalendarEvent('node-1', mockCalendarEvent);

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1')!;
        expect(node.data.calendarEvent).toEqual(mockCalendarEvent);
    });

    it('should update updatedAt timestamp', () => {
        const before = mockNode.updatedAt;
        useCanvasStore.getState().setNodeCalendarEvent('node-1', mockCalendarEvent);

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1')!;
        expect(node.updatedAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('should clear calendar event when set to undefined', () => {
        useCanvasStore.getState().setNodeCalendarEvent('node-1', mockCalendarEvent);
        useCanvasStore.getState().setNodeCalendarEvent('node-1', undefined);

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1')!;
        expect(node.data.calendarEvent).toBeUndefined();
    });

    it('should not affect other nodes', () => {
        const otherNode: CanvasNode = {
            ...mockNode,
            id: 'node-2',
            data: { heading: 'Other node' },
        };
        useCanvasStore.setState({ nodes: [mockNode, otherNode] });

        useCanvasStore.getState().setNodeCalendarEvent('node-1', mockCalendarEvent);

        const n1 = useCanvasStore.getState().nodes.find(n => n.id === 'node-1')!;
        const n2 = useCanvasStore.getState().nodes.find(n => n.id === 'node-2')!;
        expect(n1.data.calendarEvent).toEqual(mockCalendarEvent);
        expect(n2.data.calendarEvent).toBeUndefined();
    });

    it('should preserve existing node data fields', () => {
        useCanvasStore.setState({
            nodes: [{ ...mockNode, data: { ...mockNode.data, output: 'Some notes', tags: ['tag-1'] } }],
        });

        useCanvasStore.getState().setNodeCalendarEvent('node-1', mockCalendarEvent);

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1')!;
        expect(node.data.output).toBe('Some notes');
        expect(node.data.tags).toEqual(['tag-1']);
        expect(node.data.calendarEvent).toEqual(mockCalendarEvent);
    });
});
