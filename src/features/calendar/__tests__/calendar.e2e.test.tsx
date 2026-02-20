/**
 * Calendar E2E Integration Tests
 * Tests full flow: service -> store -> badge display
 */
 
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';

vi.mock('../services/calendarClient', () => ({
    callCalendar: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { callCalendar } from '../services/calendarClient';
// eslint-disable-next-line import-x/first
import { useCalendarSync } from '../hooks/useCalendarSync';
// eslint-disable-next-line import-x/first
import { CalendarBadge } from '../components/CalendarBadge';
// eslint-disable-next-line import-x/first
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
// eslint-disable-next-line import-x/first
import type { CalendarEventMetadata } from '../types/calendarEvent';
// eslint-disable-next-line import-x/first
import { calendarStrings as cs } from '../localization/calendarStrings';

const gcalResponse = { ok: true, status: 200, data: { id: 'gcal-e2e-1' } };

describe('Calendar E2E Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [{
                id: 'e2e-node', workspaceId: 'ws-1', type: 'idea',
                data: { heading: 'Plan retrospective' }, position: { x: 0, y: 0 },
                createdAt: new Date(), updatedAt: new Date(),
            }],
            edges: [], selectedNodeIds: new Set(),
        });
    });

    it('full create flow: API call -> store update -> badge data', async () => {
        (callCalendar as Mock).mockResolvedValue(gcalResponse);

        const { result } = renderHook(() => useCalendarSync('e2e-node'));

        await act(async () => {
            await result.current.syncCreate('event', 'Sprint retro', '2026-02-20T14:00:00Z', '2026-02-20T15:00:00Z', 'Review outcomes');
        });

        expect(callCalendar).toHaveBeenCalledWith('POST', '/calendars/primary/events', expect.objectContaining({
            summary: 'Sprint retro',
            description: 'Review outcomes',
        }));

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'e2e-node')!;
        expect(node.data.calendarEvent).toBeDefined();
        expect(node.data.calendarEvent!.id).toBe('gcal-e2e-1');
        expect(node.data.calendarEvent!.status).toBe('synced');
    });

    it('badge displays correct synced state', () => {
        const meta: CalendarEventMetadata = {
            id: 'gcal-1', type: 'event', title: 'Team sync',
            date: '2026-02-20T10:00:00Z', status: 'synced',
            syncedAt: Date.now(), calendarId: 'primary',
        };

        render(<CalendarBadge metadata={meta} onClick={vi.fn()} />);

        expect(screen.getByText('Team sync')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-status', 'synced');
    });

    it('badge displays failed state with retry', () => {
        const meta: CalendarEventMetadata = {
            id: '', type: 'event', title: 'Failed event',
            date: '2026-02-20T10:00:00Z', status: 'failed',
            calendarId: 'primary', error: 'Network error',
        };
        const onRetry = vi.fn();

        render(<CalendarBadge metadata={meta} onClick={vi.fn()} onRetry={onRetry} />);

        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-status', 'failed');
        fireEvent.click(screen.getByTitle(cs.badge.retry));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('failed sync sets error status on node', async () => {
        (callCalendar as Mock).mockResolvedValue({ ok: false, status: 500, data: null });

        const { result } = renderHook(() => useCalendarSync('e2e-node'));

        await act(async () => {
            await result.current.syncCreate('event', 'Bad event', '2026-02-20T10:00:00Z');
        });

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'e2e-node')!;
        expect(node.data.calendarEvent?.status).toBe('failed');
        expect(result.current.error).toBeTruthy();
    });

    it('node deletion triggers calendar event delete', async () => {
        (callCalendar as Mock).mockResolvedValue({ ok: true, status: 204, headers: new Headers(), data: null });

        useCanvasStore.getState().setNodeCalendarEvent('e2e-node', {
            id: 'gcal-del-1', type: 'event', title: 'Delete me',
            date: '2026-02-20T10:00:00Z', status: 'synced',
            syncedAt: Date.now(), calendarId: 'primary',
        });

        const { result } = renderHook(() => useCalendarSync('e2e-node'));

        await act(async () => {
            await result.current.syncDelete();
        });

        expect(callCalendar).toHaveBeenCalledWith('DELETE', expect.stringContaining('/calendars/primary/events/gcal-del-1'));
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'e2e-node')!;
        expect(node.data.calendarEvent).toBeUndefined();
    });
});
