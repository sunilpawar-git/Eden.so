/**
 * Calendar Service Tests - Tests validation + server-side delegation
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { CalendarEventType } from '../types/calendarEvent';

vi.mock('../services/serverCalendarClient', () => ({
    serverCreateEvent: vi.fn(),
    serverDeleteEvent: vi.fn(),
    serverListEvents: vi.fn(),
    serverUpdateEvent: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { serverCreateEvent, serverDeleteEvent, serverListEvents } from '../services/serverCalendarClient';
// eslint-disable-next-line import-x/first
import { createEvent, deleteEvent, validateEventInput, listEvents } from '../services/calendarService';

const validDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
const validEndDate = new Date(Date.now() + 90000000).toISOString(); // tomorrow + 1hr

describe('calendarService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('createEvent', () => {
        it('should create event and return metadata', async () => {
            (serverCreateEvent as Mock).mockResolvedValue({
                id: 'gcal-event-1', type: 'event', title: 'Team standup',
                date: validDate, status: 'synced', syncedAt: Date.now(),
                calendarId: 'primary',
            });

            const result = await createEvent('event', 'Team standup', validDate);

            expect(serverCreateEvent).toHaveBeenCalledWith(
                'event', 'Team standup', validDate, undefined, undefined,
            );
            expect(result.id).toBe('gcal-event-1');
            expect(result.status).toBe('synced');
        });

        it('should reject titles that are too short', async () => {
            await expect(createEvent('event', '', validDate)).rejects.toThrow();
        });

        it('should reject titles that are too long', async () => {
            const longTitle = 'A'.repeat(201);
            await expect(createEvent('event', longTitle, validDate)).rejects.toThrow();
        });

        it('should reject invalid dates', async () => {
            await expect(createEvent('event', 'Test event', 'not-a-date')).rejects.toThrow();
        });

        it('should reject dates too far in the future', async () => {
            const futureDate = new Date(Date.now() + 11 * 365 * 24 * 60 * 60 * 1000).toISOString();
            await expect(createEvent('event', 'Future event', futureDate)).rejects.toThrow();
        });

        it('should reject end date before start', async () => {
            const pastEnd = new Date(Date.now() - 86400000).toISOString();
            await expect(createEvent('event', 'Backwards', validDate, pastEnd)).rejects.toThrow();
        });

        it('should reject notes that are too long', async () => {
            const longNotes = 'X'.repeat(5001);
            await expect(createEvent('event', 'Test event', validDate, undefined, longNotes)).rejects.toThrow();
        });

        it('should pass end date and notes to server', async () => {
            (serverCreateEvent as Mock).mockResolvedValue({
                id: 'gcal-2', type: 'event', title: 'Meeting',
                date: validDate, endDate: validEndDate, notes: 'Some notes',
                status: 'synced', syncedAt: Date.now(), calendarId: 'primary',
            });

            await createEvent('event', 'Meeting', validDate, validEndDate, 'Some notes');

            expect(serverCreateEvent).toHaveBeenCalledWith(
                'event', 'Meeting', validDate, validEndDate, 'Some notes',
            );
        });

        it('should propagate server errors', async () => {
            (serverCreateEvent as Mock).mockRejectedValue(new Error('Internal Server Error'));

            await expect(
                createEvent('event', 'Team standup', validDate),
            ).rejects.toThrow('Internal Server Error');
        });
    });

    describe('deleteEvent', () => {
        it('should delete event by ID', async () => {
            (serverDeleteEvent as Mock).mockResolvedValue(undefined);

            await deleteEvent('gcal-event-1');

            expect(serverDeleteEvent).toHaveBeenCalledWith('gcal-event-1');
        });

        it('should propagate server errors', async () => {
            (serverDeleteEvent as Mock).mockRejectedValue(new Error('Failed to delete'));

            await expect(deleteEvent('gcal-event-1')).rejects.toThrow('Failed to delete');
        });
    });

    describe('validateEventInput', () => {
        const types: CalendarEventType[] = ['event', 'reminder', 'todo'];

        types.forEach((type) => {
            it(`should accept valid input for type ${type}`, () => {
                expect(validateEventInput('Valid title', validDate, type)).toEqual([]);
            });
        });

        it('should reject empty title', () => {
            expect(validateEventInput('', validDate, 'event')).toContain('invalidTitle');
        });

        it('should reject title over 200 chars', () => {
            expect(validateEventInput('A'.repeat(201), validDate, 'event')).toContain('invalidTitle');
        });

        it('should reject invalid date', () => {
            expect(validateEventInput('Valid', 'not-a-date', 'event')).toContain('invalidDate');
        });

        it('should reject end before start', () => {
            const pastEnd = new Date(Date.now() - 86400000).toISOString();
            expect(validateEventInput('Valid', validDate, 'event', pastEnd)).toContain('endBeforeStart');
        });

        it('should reject notes over 5000 chars', () => {
            expect(validateEventInput('Valid', validDate, 'event', undefined, 'X'.repeat(5001))).toContain('notesTooLong');
        });
    });

    describe('listEvents', () => {
        it('should fetch events and return formatted data', async () => {
            (serverListEvents as Mock).mockResolvedValue([
                { title: 'Meeting', date: '2026-02-20T10:00:00Z', endDate: '2026-02-20T11:00:00Z' },
            ]);

            const events = await listEvents(validDate, validEndDate);

            expect(serverListEvents).toHaveBeenCalledWith(validDate, validEndDate);
            expect(events).toHaveLength(1);
            expect(events[0]!.title).toBe('Meeting');
        });

        it('should propagate server errors', async () => {
            (serverListEvents as Mock).mockRejectedValue(new Error('Failed to fetch'));

            await expect(listEvents(validDate, validEndDate)).rejects.toThrow('Failed to fetch');
        });
    });
});
