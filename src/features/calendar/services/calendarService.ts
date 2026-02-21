/**
 * Calendar Service - High-level CRUD for Google Calendar events
 * Validates input and delegates to the server-side Cloud Functions proxy.
 */
import {
    serverCreateEvent,
    serverDeleteEvent,
    serverUpdateEvent,
    serverListEvents,
} from './serverCalendarClient';
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

/** Create a Google Calendar event and return node metadata. */
export async function createEvent(
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    throwIfInvalid(title, date, type, endDate, notes);
    return serverCreateEvent(type, title, date, endDate, notes);
}

/** Delete a Google Calendar event. */
export async function deleteEvent(eventId: string): Promise<void> {
    return serverDeleteEvent(eventId);
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
    return serverUpdateEvent(eventId, type, title, date, endDate, notes);
}

/**
 * Fetch calendar events within a given timeframe.
 * Returns a simplified list of events containing title and start time.
 */
export async function listEvents(
    startDate: string,
    endDate: string,
): Promise<Array<{ title: string; date: string; endDate?: string }>> {
    return serverListEvents(startDate, endDate);
}
