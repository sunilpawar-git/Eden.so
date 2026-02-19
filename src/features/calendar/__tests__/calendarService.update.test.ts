/**
 * Calendar Service Update Tests - TDD for updateEvent
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('../services/calendarClient', () => ({
    callCalendar: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { callCalendar } from '../services/calendarClient';
// eslint-disable-next-line import-x/first
import { updateEvent } from '../services/calendarService';

const validDate = new Date(Date.now() + 86400000).toISOString();

describe('updateEvent', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should update event and return metadata', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: true, status: 200,
            data: { id: 'gcal-1' },
        });

        const result = await updateEvent('gcal-1', 'event', 'Updated title', validDate, undefined, 'New notes');

        expect(callCalendar).toHaveBeenCalledWith(
            'PATCH',
            '/calendars/primary/events/gcal-1',
            expect.objectContaining({ summary: 'Updated title', description: 'New notes' }),
        );
        expect(result.id).toBe('gcal-1');
        expect(result.title).toBe('Updated title');
        expect(result.status).toBe('synced');
    });

    it('should throw on API error', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: false, status: 500,
            data: { error: { message: 'Server Error' } },
        });

        await expect(updateEvent('gcal-1', 'event', 'Test', validDate)).rejects.toThrow('Server Error');
    });

    it('should throw generic message when no error detail', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: false, status: 500, data: null,
        });

        await expect(updateEvent('gcal-1', 'event', 'Test', validDate)).rejects.toThrow();
    });

    it('should preserve event type on update', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: true, status: 200,
            data: { id: 'gcal-1' },
        });

        const result = await updateEvent('gcal-1', 'reminder', 'Ping team', validDate);

        expect(result.type).toBe('reminder');
    });

    it('should preserve timezone offset in calculated end time', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: true, status: 200,
            data: { id: 'gcal-1' },
        });

        await updateEvent('gcal-1', 'event', 'Standup', '2026-02-20T10:00:00+05:30');

        const call = (callCalendar as Mock).mock.calls[0] as unknown[];
        const body = call[2] as { end: { dateTime: string } };
        expect(body.end.dateTime).toBe('2026-02-20T10:30:00+05:30');
    });

    it('should calculate default end time when not provided', async () => {
        (callCalendar as Mock).mockResolvedValue({
            ok: true, status: 200,
            data: { id: 'gcal-1' },
        });

        await updateEvent('gcal-1', 'event', 'Quick chat', validDate);

        const call = (callCalendar as Mock).mock.calls[0] as unknown[];
        const body = call[2] as { end: { dateTime: string } };
        const endMs = new Date(body.end.dateTime).getTime();
        const startMs = new Date(validDate).getTime();
        expect(endMs - startMs).toBe(30 * 60 * 1000);
    });
});
