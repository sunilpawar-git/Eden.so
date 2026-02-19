/**
 * Calendar Service - High-level CRUD for Google Calendar events
 * Handles validation, end-time calculation, and error mapping
 */
import { callCalendar } from './calendarClient';
import type {
    CalendarEventMetadata,
    CalendarEventType,
} from '../types/calendarEvent';
import {
    TITLE_MIN_LENGTH,
    TITLE_MAX_LENGTH,
    NOTES_MAX_LENGTH,
    MAX_FUTURE_YEARS,
} from '../types/calendarEvent';
import { calendarStrings as cs } from '../localization/calendarStrings';

const DEFAULT_EVENT_DURATION_MS = 30 * 60 * 1000;

type ValidationErrorKey =
    | 'invalidTitle'
    | 'invalidDate'
    | 'endBeforeStart'
    | 'dateTooFar'
    | 'notesTooLong';

/** Validate calendar event input. Returns array of error keys (empty = valid). */
export function validateEventInput(
    title: string,
    date: string,
    _type: CalendarEventType,
    endDate?: string,
    notes?: string,
): ValidationErrorKey[] {
    const errors: ValidationErrorKey[] = [];

    if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
        errors.push('invalidTitle');
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
        errors.push('invalidDate');
    } else {
        const maxDate = new Date(Date.now() + MAX_FUTURE_YEARS * 365 * 24 * 60 * 60 * 1000);
        if (parsed > maxDate) errors.push('dateTooFar');
    }

    if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime()) && !isNaN(parsed.getTime()) && parsedEnd <= parsed) {
            errors.push('endBeforeStart');
        }
    }

    if (notes && notes.length > NOTES_MAX_LENGTH) {
        errors.push('notesTooLong');
    }

    return errors;
}

function throwIfInvalid(title: string, date: string, type: CalendarEventType, endDate?: string, notes?: string): void {
    const errors = validateEventInput(title, date, type, endDate, notes);
    if (errors.length === 0) return;
    const key = errors[0] as keyof typeof cs.errors;
    throw new Error(cs.errors[key]);
}

function calculateEndTime(startDate: string, type: CalendarEventType): string {
    if (type === 'event') {
        const start = new Date(startDate);
        return new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS).toISOString();
    }
    return startDate;
}

function extractErrorMessage(data: Record<string, unknown> | null, fallback: string): string {
    if (!data) return fallback;
    const error = data.error as Record<string, unknown> | undefined;
    const message = error?.message;
    return typeof message === 'string' ? message : fallback;
}

/** Create a Google Calendar event and return node metadata. */
export async function createEvent(
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    throwIfInvalid(title, date, type, endDate, notes);

    const eventBody: Record<string, unknown> = {
        summary: title,
        start: { dateTime: date },
        end: { dateTime: endDate ?? calculateEndTime(date, type) },
        description: notes,
    };

    if (type === 'reminder') {
        eventBody.reminders = { useDefault: true };
    }

    const result = await callCalendar('POST', '/calendars/primary/events', eventBody);

    if (!result.ok) {
        throw new Error(extractErrorMessage(result.data, 'Failed to create event'));
    }

    const rawId = result.data?.id;
    const eventId = typeof rawId === 'string' ? rawId : '';
    return {
        id: eventId,
        type,
        title,
        date,
        endDate,
        notes,
        status: 'synced',
        syncedAt: Date.now(),
        calendarId: 'primary',
    };
}

/** Delete a Google Calendar event. Ignores 404 (already deleted). */
export async function deleteEvent(eventId: string): Promise<void> {
    const result = await callCalendar('DELETE', `/calendars/primary/events/${encodeURIComponent(eventId)}`);

    if (!result.ok && result.status !== 404) {
        throw new Error('Failed to delete event');
    }
}

/** Update an existing Google Calendar event. */
export async function updateEvent(
    eventId: string,
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    throwIfInvalid(title, date, type, endDate, notes);

    const eventBody: Record<string, unknown> = {
        summary: title,
        start: { dateTime: date },
        end: { dateTime: endDate ?? calculateEndTime(date, type) },
        description: notes,
    };

    const result = await callCalendar('PATCH', `/calendars/primary/events/${encodeURIComponent(eventId)}`, eventBody);

    if (!result.ok) {
        throw new Error(extractErrorMessage(result.data, 'Failed to update event'));
    }

    return {
        id: eventId,
        type,
        title,
        date,
        endDate,
        notes,
        status: 'synced',
        syncedAt: Date.now(),
        calendarId: 'primary',
    };
}
