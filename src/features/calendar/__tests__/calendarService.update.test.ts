/**
 * Calendar Service Update Tests - TDD for updateEvent
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('../services/serverCalendarClient', () => ({
    serverCreateEvent: vi.fn(),
    serverDeleteEvent: vi.fn(),
    serverUpdateEvent: vi.fn(),
    serverListEvents: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { serverUpdateEvent } from '../services/serverCalendarClient';
// eslint-disable-next-line import-x/first
import { updateEvent } from '../services/calendarService';

const validDate = new Date(Date.now() + 86400000).toISOString();

describe('updateEvent', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should update event and return metadata', async () => {
        (serverUpdateEvent as Mock).mockResolvedValue({
            id: 'gcal-1', type: 'event', title: 'Updated title',
            date: validDate, notes: 'New notes',
            status: 'synced', syncedAt: Date.now(), calendarId: 'primary',
        });

        const result = await updateEvent('gcal-1', 'event', 'Updated title', validDate, undefined, 'New notes');

        expect(serverUpdateEvent).toHaveBeenCalledWith(
            'gcal-1', 'event', 'Updated title', validDate, undefined, 'New notes',
        );
        expect(result.id).toBe('gcal-1');
        expect(result.title).toBe('Updated title');
        expect(result.status).toBe('synced');
    });

    it('should throw on server error', async () => {
        (serverUpdateEvent as Mock).mockRejectedValue(new Error('Server Error'));

        await expect(updateEvent('gcal-1', 'event', 'Test', validDate)).rejects.toThrow('Server Error');
    });

    it('should reject invalid input before calling server', async () => {
        await expect(updateEvent('gcal-1', 'event', '', validDate)).rejects.toThrow();
        expect(serverUpdateEvent).not.toHaveBeenCalled();
    });

    it('should preserve event type on update', async () => {
        (serverUpdateEvent as Mock).mockResolvedValue({
            id: 'gcal-1', type: 'reminder', title: 'Ping team',
            date: validDate, status: 'synced', syncedAt: Date.now(),
            calendarId: 'primary',
        });

        const result = await updateEvent('gcal-1', 'reminder', 'Ping team', validDate);

        expect(result.type).toBe('reminder');
    });
});
