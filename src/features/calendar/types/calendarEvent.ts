/**
 * Calendar Event Type Definitions
 * Model layer for calendar/reminder/todo feature (MVVM)
 */

/** Supported calendar item types */
export type CalendarEventType = 'event' | 'reminder' | 'todo' | 'read';

/** Sync status for calendar items */
export type CalendarSyncStatus = 'pending' | 'synced' | 'failed';

/** Title length constraints */
export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 200;

/** Notes length constraints */
export const NOTES_MAX_LENGTH = 5000;

/** Max years in the future for events */
export const MAX_FUTURE_YEARS = 10;

/** API request timeout in milliseconds */
export const CALENDAR_API_TIMEOUT_MS = 10_000;

/** Google Calendar API base URL */
export const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Metadata stored on a node representing a synced calendar item.
 * One calendar item per node (simpler data model).
 */
export interface CalendarEventMetadata {
    id: string;
    type: CalendarEventType;
    title: string;
    date: string;
    endDate?: string;
    notes?: string;
    status: CalendarSyncStatus;
    syncedAt?: number;
    calendarId: string;
    error?: string;
}

/**
 * Result from a low-level Google Calendar API call.
 * Wraps fetch response for uniform error handling.
 */
export interface CalendarCallResult {
    ok: boolean;
    status: number;
    data: Record<string, unknown> | null;
}
