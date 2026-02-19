/**
 * useIdeaCardCalendar Tests
 * Tests retry, cleanup, and loading passthrough for the slimmed-down hook
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/calendarService', () => ({
    createEvent: vi.fn(),
    deleteEvent: vi.fn(),
    updateEvent: vi.fn(),
}));

vi.mock('../services/calendarClient', () => ({
    callCalendar: vi.fn(),
    isCalendarAvailable: vi.fn(() => true),
}));

vi.mock('@/features/auth/services/authService', () => ({
    reauthenticateForCalendar: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { createEvent, deleteEvent, updateEvent } from '../services/calendarService';
// eslint-disable-next-line import-x/first
import { isCalendarAvailable } from '../services/calendarClient';
// eslint-disable-next-line import-x/first
import { reauthenticateForCalendar } from '@/features/auth/services/authService';
// eslint-disable-next-line import-x/first
import { useIdeaCardCalendar } from '../hooks/useIdeaCardCalendar';
// eslint-disable-next-line import-x/first
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
// eslint-disable-next-line import-x/first
import type { CalendarEventMetadata } from '../types/calendarEvent';

const syncedMeta: CalendarEventMetadata = {
    id: 'gcal-1', type: 'event', title: 'Standup',
    date: '2026-02-20T10:00:00Z', status: 'synced',
    syncedAt: Date.now(), calendarId: 'primary',
};

const failedMetaNoId: CalendarEventMetadata = {
    id: '', type: 'reminder', title: 'Call client',
    date: '2026-02-21T09:00:00Z', status: 'failed',
    calendarId: 'primary', error: 'API error',
};

const pendingMeta: CalendarEventMetadata = {
    id: '', type: 'reminder', title: 'Walk Sheero',
    date: '2026-02-19T15:30:00Z', status: 'pending',
    calendarId: 'primary',
};

describe('useIdeaCardCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [{
                id: 'node-1', workspaceId: 'ws-1', type: 'idea',
                data: { heading: 'Test' }, position: { x: 0, y: 0 },
                createdAt: new Date(), updatedAt: new Date(),
            }],
            edges: [], selectedNodeIds: new Set(),
        });
    });

    describe('handleRetry', () => {
        it('calls syncUpdate when calendarEvent has an id', async () => {
            (updateEvent as Mock).mockResolvedValue(syncedMeta);

            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: syncedMeta }),
            );

            await act(async () => {
                await result.current.handleRetry();
            });

            expect(updateEvent).toHaveBeenCalledWith(
                'gcal-1', 'event', 'Standup', '2026-02-20T10:00:00Z', undefined, undefined,
            );
        });

        it('calls syncCreate when calendarEvent has no id', async () => {
            (createEvent as Mock).mockResolvedValue({ ...failedMetaNoId, id: 'gcal-new', status: 'synced' });

            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: failedMetaNoId }),
            );

            await act(async () => {
                await result.current.handleRetry();
            });

            expect(createEvent).toHaveBeenCalledWith(
                'reminder', 'Call client', '2026-02-21T09:00:00Z', undefined, undefined,
            );
        });

        it('is a no-op when calendarEvent is undefined', async () => {
            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1' }),
            );

            await act(async () => {
                await result.current.handleRetry();
            });

            expect(createEvent).not.toHaveBeenCalled();
            expect(updateEvent).not.toHaveBeenCalled();
        });

        it('triggers re-auth when token missing, then creates event', async () => {
            (isCalendarAvailable as Mock).mockReturnValue(false);
            (reauthenticateForCalendar as Mock).mockResolvedValue(true);
            (createEvent as Mock).mockResolvedValue({ ...pendingMeta, id: 'gcal-new', status: 'synced' });

            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: pendingMeta }),
            );

            await act(async () => {
                await result.current.handleRetry();
            });

            expect(reauthenticateForCalendar).toHaveBeenCalled();
            expect(createEvent).toHaveBeenCalledWith(
                'reminder', 'Walk Sheero', '2026-02-19T15:30:00Z', undefined, undefined,
            );
        });

        it('skips event creation when re-auth fails', async () => {
            (isCalendarAvailable as Mock).mockReturnValue(false);
            (reauthenticateForCalendar as Mock).mockResolvedValue(false);

            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: pendingMeta }),
            );

            await act(async () => {
                await result.current.handleRetry();
            });

            expect(reauthenticateForCalendar).toHaveBeenCalled();
            expect(createEvent).not.toHaveBeenCalled();
        });
    });

    describe('cleanupOnDelete', () => {
        it('calls deleteEvent via syncDelete when calendarEvent has an id', async () => {
            (deleteEvent as Mock).mockResolvedValue(undefined);
            useCanvasStore.getState().setNodeCalendarEvent('node-1', syncedMeta);

            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: syncedMeta }),
            );

            await act(async () => {
                result.current.cleanupOnDelete();
            });

            expect(deleteEvent).toHaveBeenCalledWith('gcal-1');
        });

        it('is a no-op when calendarEvent has no id', () => {
            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1', calendarEvent: failedMetaNoId }),
            );

            act(() => {
                result.current.cleanupOnDelete();
            });

            expect(deleteEvent).not.toHaveBeenCalled();
        });

        it('is a no-op when calendarEvent is undefined', () => {
            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1' }),
            );

            act(() => {
                result.current.cleanupOnDelete();
            });

            expect(deleteEvent).not.toHaveBeenCalled();
        });
    });

    describe('isLoading', () => {
        it('passes through isLoading from useCalendarSync', () => {
            const { result } = renderHook(() =>
                useIdeaCardCalendar({ nodeId: 'node-1' }),
            );

            expect(result.current.isLoading).toBe(false);
        });
    });
});
