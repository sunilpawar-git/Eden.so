/**
 * Calendar Client - Low-level Google Calendar API wrapper
 * Uses OAuth Bearer token from authStore (in-memory only)
 */
import { getGoogleAccessToken } from '@/features/auth/services/authTokenService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { CalendarCallResult } from '../types/calendarEvent';
import {
    CALENDAR_API_BASE,
    CALENDAR_API_TIMEOUT_MS,
} from '../types/calendarEvent';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Make a Google Calendar API call with the user's OAuth access token.
 * Auto-clears token on 401 (expired). Returns structured result.
 */
export async function callCalendar(
    method: HttpMethod,
    endpoint: string,
    body?: Record<string, unknown>,
): Promise<CalendarCallResult> {
    const accessToken = getGoogleAccessToken();
    if (!accessToken) return { ok: false, status: 401, data: null };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CALENDAR_API_TIMEOUT_MS);

    try {
        const url = `${CALENDAR_API_BASE}${endpoint}`;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        if (response.status === 401) {
            useAuthStore.getState().setGoogleAccessToken(null);
            return { ok: false, status: 401, data: null };
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { ok: response.ok, status: response.status, data: null };
        }

        const data = (await response.json()) as Record<string, unknown>;
        return { ok: response.ok, status: response.status, data };
    } catch {
        return { ok: false, status: 0, data: null };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Check if calendar features are available (token exists in memory).
 */
export function isCalendarAvailable(): boolean {
    return getGoogleAccessToken() !== null;
}
