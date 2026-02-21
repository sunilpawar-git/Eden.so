/**
 * Google Calendar Client
 * Interacts directly with the Google Calendar v3 API using the client-side
 * Access Token obtained from GIS. No backend proxy is required.
 */
import { getCalendarToken } from '@/features/auth/services/calendarAuthService';
import type { CalendarEventMetadata, CalendarEventType } from '../types/calendarEvent';
import { calendarStrings as cs } from '../localization/calendarStrings';

/** Error code returned when the user needs to re-authenticate (token expired/revoked). */
export const REAUTH_REQUIRED = 'REAUTH_REQUIRED';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarEventItem {
    id?: string;
    summary?: string;
    start?: {
        dateTime?: string;
        date?: string;
    };
    end?: {
        dateTime?: string;
        date?: string;
    };
}

interface GoogleCalendarListResponse {
    items?: GoogleCalendarEventItem[];
}

async function fetchGoogleApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getCalendarToken();
    if (!token) throw new Error(REAUTH_REQUIRED);

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const res = await fetch(`${GOOGLE_CALENDAR_API}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401 || res.status === 403) {
        throw new Error(REAUTH_REQUIRED);
    }

    if (!res.ok) {
        throw new Error(cs.errors.createFailed);
    }

    // DELETE requests may return 204 No Content
    if (res.status === 204) return null as unknown as T;

    return (await res.json()) as T;
}

/** List events directly from Google Calendar API. */
export async function serverListEvents(
    startDate: string,
    endDate: string,
): Promise<Array<{ title: string; date: string; endDate?: string }>> {
    const query = new URLSearchParams({
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    const data = await fetchGoogleApi<GoogleCalendarListResponse>(`/calendars/primary/events?${query}`);

    const items = data.items ?? [];

    return items.map((item) => ({
        title: item.summary ?? 'Untitled Event',
        date: item.start?.dateTime ?? item.start?.date ?? '',
        endDate: item.end?.dateTime ?? item.end?.date,
    }));
}

/** Helper to format Google Event body */
function createGoogleEventBody(
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
) {
    const startObj: { dateTime?: string; date?: string } = {};
    const endObj: { dateTime?: string; date?: string } = {};

    if (date.includes('T')) {
        startObj.dateTime = new Date(date).toISOString();
        if (endDate) {
            endObj.dateTime = new Date(endDate).toISOString();
        } else {
            // Default 1 hour duration
            const end = new Date(date);
            end.setHours(end.getHours() + 1);
            endObj.dateTime = end.toISOString();
        }
    } else {
        startObj.date = date; // 'YYYY-MM-DD'
        if (endDate) {
            endObj.date = endDate;
        } else {
            endObj.date = date;
        }
    }

    return {
        summary: title,
        description: notes ?? '',
        start: startObj,
        end: endObj,
    };
}

/** Create event directly via Google Calendar API. */
export async function serverCreateEvent(
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    const body = createGoogleEventBody(title, date, endDate, notes);

    const data = await fetchGoogleApi<{ id?: string }>('/calendars/primary/events', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    return {
        id: data.id ?? '',
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

/** Update event directly via Google Calendar API. */
export async function serverUpdateEvent(
    eventId: string,
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    const body = createGoogleEventBody(title, date, endDate, notes);

    await fetchGoogleApi(`/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

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

/** Delete event directly via Google Calendar API. */
export async function serverDeleteEvent(eventId: string): Promise<void> {
    await fetchGoogleApi(`/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
    });
}
