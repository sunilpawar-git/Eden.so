/**
 * Calendar Service Tests - TDD: Written FIRST (RED phase)
 * Tests high-level calendar CRUD and validation
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { CalendarEventType } from '../types/calendarEvent';

vi.mock('../services/calendarClient', () => ({
    callCalendar: vi.fn(),
}));

// eslint-disable-next-line import-x/first -- must follow vi.mock()
import { callCalendar } from '../services/calendarClient';
// eslint-disable-next-line import-x/first
import { createEvent, deleteEvent, validateEventInput } from '../services/calendarService';

const validDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
const validEndDate = new Date(Date.now() + 90000000).toISOString(); // tomorrow + 1hr

describe('calendarService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('createEvent', () => {
        it('should create event and return metadata', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-event-1' },
            });

            const result = await createEvent('event', 'Team standup', validDate, validEndDate, 'Weekly sync');

            expect(callCalendar).toHaveBeenCalledWith(
                'POST',
                '/calendars/primary/events',
                expect.objectContaining({
                    summary: 'Team standup',
                    description: 'Weekly sync',
                }),
            );
            expect(result.id).toBe('gcal-event-1');
            expect(result.type).toBe('event');
            expect(result.title).toBe('Team standup');
            expect(result.status).toBe('synced');
            expect(result.calendarId).toBe('primary');
            expect(result.syncedAt).toBeGreaterThan(0);
        });

        it('should create reminder with correct structure', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-rem-1' },
            });

            const result = await createEvent('reminder', 'Call client', validDate);

            expect(callCalendar).toHaveBeenCalledWith(
                'POST',
                '/calendars/primary/events',
                expect.objectContaining({
                    summary: 'Call client',
                    reminders: { useDefault: true },
                }),
            );
            expect(result.type).toBe('reminder');
        });

        it('should create todo item', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-todo-1' },
            });

            const result = await createEvent('todo', 'Submit report', validDate);

            expect(result.type).toBe('todo');
            expect(result.id).toBe('gcal-todo-1');
        });

        it('should calculate default end time for events (30 min)', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-e-1' },
            });

            await createEvent('event', 'Quick chat', validDate);

            const call = (callCalendar as Mock).mock.calls[0] as unknown[];
            const body = call[2] as { start: { dateTime: string }; end: { dateTime: string } };
            const startMs = new Date(body.start.dateTime).getTime();
            const endMs = new Date(body.end.dateTime).getTime();
            expect(endMs - startMs).toBe(30 * 60 * 1000);
        });

        it('should preserve timezone offset in calculated end time', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-tz-1' },
            });

            await createEvent('event', 'Meeting', '2026-02-20T17:00:00+05:30');

            const call = (callCalendar as Mock).mock.calls[0] as unknown[];
            const body = call[2] as { start: { dateTime: string }; end: { dateTime: string } };
            expect(body.end.dateTime).toBe('2026-02-20T17:30:00+05:30');
            expect(body.start.dateTime).toBe('2026-02-20T17:00:00+05:30');
        });

        it('should preserve negative timezone offset in calculated end time', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-tz-2' },
            });

            await createEvent('event', 'Standup', '2026-02-20T09:00:00-08:00');

            const call = (callCalendar as Mock).mock.calls[0] as unknown[];
            const body = call[2] as { start: { dateTime: string }; end: { dateTime: string } };
            expect(body.end.dateTime).toBe('2026-02-20T09:30:00-08:00');
        });

        it('should use same time for reminder/todo end', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                data: { id: 'gcal-r-1' },
            });

            await createEvent('reminder', 'Ping team', validDate);

            const call = (callCalendar as Mock).mock.calls[0] as unknown[];
            const body = call[2] as { start: { dateTime: string }; end: { dateTime: string } };
            expect(body.start.dateTime).toBe(body.end.dateTime);
        });

        it('should throw on API error', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: false,
                status: 500,
                data: { error: { message: 'Internal Server Error' } },
            });

            await expect(
                createEvent('event', 'Team standup', validDate),
            ).rejects.toThrow('Internal Server Error');
        });

        it('should throw generic message when no error detail', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: false,
                status: 500,
                data: null,
            });

            await expect(
                createEvent('event', 'Team standup', validDate),
            ).rejects.toThrow('Failed to create calendar event. Please try again.');
        });
    });

    describe('deleteEvent', () => {
        it('should delete event by ID', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: true,
                status: 204,
                data: {},
            });

            await deleteEvent('gcal-event-1');

            expect(callCalendar).toHaveBeenCalledWith(
                'DELETE',
                '/calendars/primary/events/gcal-event-1',
            );
        });

        it('should not throw on 404 (already deleted)', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: false,
                status: 404,
                data: { error: { message: 'Not Found' } },
            });

            await expect(deleteEvent('gcal-event-gone')).resolves.toBeUndefined();
        });

        it('should throw on other errors', async () => {
            (callCalendar as Mock).mockResolvedValue({
                ok: false,
                status: 500,
                data: null,
            });

            await expect(deleteEvent('gcal-event-1')).rejects.toThrow('Failed to delete calendar event.');
        });
    });

    describe('validateEventInput', () => {
        it('should accept valid input', () => {
            const errors = validateEventInput('Team standup', validDate, 'event' as CalendarEventType);
            expect(errors).toHaveLength(0);
        });

        it('should reject empty title', () => {
            const errors = validateEventInput('', validDate, 'event' as CalendarEventType);
            expect(errors).toContain('invalidTitle');
        });

        it('should reject title over 200 chars', () => {
            const longTitle = 'a'.repeat(201);
            const errors = validateEventInput(longTitle, validDate, 'event' as CalendarEventType);
            expect(errors).toContain('invalidTitle');
        });

        it('should reject invalid date', () => {
            const errors = validateEventInput('Test', 'not-a-date', 'event' as CalendarEventType);
            expect(errors).toContain('invalidDate');
        });

        it('should reject date more than 10 years in future', () => {
            const farFuture = new Date(Date.now() + 11 * 365 * 24 * 60 * 60 * 1000).toISOString();
            const errors = validateEventInput('Test', farFuture, 'event' as CalendarEventType);
            expect(errors).toContain('dateTooFar');
        });

        it('should reject end date before start date', () => {
            const start = new Date(Date.now() + 86400000).toISOString();
            const end = new Date(Date.now() + 3600000).toISOString();
            const errors = validateEventInput('Test', start, 'event' as CalendarEventType, end);
            expect(errors).toContain('endBeforeStart');
        });

        it('should reject notes over 5000 chars', () => {
            const longNotes = 'a'.repeat(5001);
            const errors = validateEventInput('Test', validDate, 'event' as CalendarEventType, undefined, longNotes);
            expect(errors).toContain('notesTooLong');
        });

        it('should accept valid notes', () => {
            const errors = validateEventInput('Test', validDate, 'event' as CalendarEventType, undefined, 'Short note');
            expect(errors).toHaveLength(0);
        });
    });
});
