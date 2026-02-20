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

/**
 * Compute end time by adding the default duration.
 * Preserves the original offset (e.g. +05:30) so Google Calendar gets
 * the correct local time. Falls back to ISO/Z if no offset found.
 */
function calculateEndTime(startDate: string, type: CalendarEventType): string {
    if (type !== 'event') return startDate;

    const start = new Date(startDate);
    const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);

    const offsetMatch = /([+-]\d{2}:\d{2})$/.exec(startDate);
    if (!offsetMatch?.[1]) return end.toISOString();

    const offset = offsetMatch[1];
    const offsetMin = parseOffsetMinutes(offset);
    const local = new Date(end.getTime() + offsetMin * 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
        `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${offset}`;
}

function parseOffsetMinutes(offset: string): number {
    const sign = offset.startsWith('+') ? 1 : -1;
    const parts = offset.slice(1).split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    return sign * (h * 60 + m);
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

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventBody: Record<string, unknown> = {
        summary: title,
        start: { dateTime: date, timeZone: tz },
        end: { dateTime: endDate ?? calculateEndTime(date, type), timeZone: tz },
        description: notes,
    };

    if (type === 'reminder') {
        eventBody.reminders = { useDefault: true };
    }

    const result = await callCalendar('POST', '/calendars/primary/events', eventBody);

    if (!result.ok) {
        throw new Error(extractErrorMessage(result.data, cs.errors.createFailed));
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
        throw new Error(cs.errors.deleteFailed);
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

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventBody: Record<string, unknown> = {
        summary: title,
        start: { dateTime: date, timeZone: tz },
        end: { dateTime: endDate ?? calculateEndTime(date, type), timeZone: tz },
        description: notes,
    };

    const result = await callCalendar('PATCH', `/calendars/primary/events/${encodeURIComponent(eventId)}`, eventBody);

    if (!result.ok) {
        throw new Error(extractErrorMessage(result.data, cs.errors.updateFailed));
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

/**
 * Fetch calendar events within a given timeframe.
 * Returns a simplified list of events containing title and start time.
 */
export async function listEvents(
    startDate: string,
    endDate: string,
): Promise<Array<{ title: string; date: string; endDate?: string }>> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const query = new URLSearchParams({
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        timeZone: tz,
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    const result = await callCalendar('GET', `/calendars/primary/events?${query.toString()}`);

    if (!result.ok) {
        throw new Error(extractErrorMessage(result.data, cs.errors.readFailed));
    }

    const items = (result.data?.items ?? []) as Array<Record<string, unknown>>;

    return items.map((item) => {
        const startObj = item.start as Record<string, string> | undefined;
        const endObj = item.end as Record<string, string> | undefined;
        const start = startObj?.dateTime ?? startObj?.date ?? new Date().toISOString();
        const end = endObj?.dateTime ?? endObj?.date;
        return {
            title: (item.summary as string) || 'Busy',
            date: start,
            endDate: end,
        };
    });
}
