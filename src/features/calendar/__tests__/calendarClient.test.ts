/**
 * Calendar Client Tests - TDD: Written FIRST (RED phase)
 * Tests low-level Google Calendar API call wrapper
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CALENDAR_API_BASE } from '../types/calendarEvent';

vi.mock('@/features/auth/services/authTokenService', () => ({
    getGoogleAccessToken: vi.fn(),
}));

// eslint-disable-next-line import-x/first -- must follow vi.mock()
import { getGoogleAccessToken } from '@/features/auth/services/authTokenService';
// eslint-disable-next-line import-x/first
import { callCalendar, isCalendarAvailable } from '../services/calendarClient';

const mockToken = 'mock-oauth-access-token';

describe('calendarClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        (getGoogleAccessToken as Mock).mockReturnValue(mockToken);
        global.fetch = vi.fn();
    });

    describe('callCalendar', () => {
        it('should make GET request with Bearer token', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-length': '42' }),
                json: () => Promise.resolve({ id: 'event-1' }),
            });

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(global.fetch).toHaveBeenCalledWith(
                `${CALENDAR_API_BASE}/calendars/primary/events`,
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${mockToken}`,
                    },
                    body: undefined,
                    signal: expect.any(AbortSignal),
                }),
            );
            expect(result).toEqual({ ok: true, status: 200, data: { id: 'event-1' } });
        });

        it('should make POST request with body', async () => {
            const body = { summary: 'Team standup' };
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-length': '42' }),
                json: () => Promise.resolve({ id: 'event-2' }),
            });

            await callCalendar('POST', '/calendars/primary/events', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body),
                }),
            );
        });

        it('should make DELETE request without body', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                status: 204,
                headers: new Headers({ 'content-length': '0' }),
                json: () => { throw new SyntaxError('Unexpected end of input'); },
            });

            const result = await callCalendar('DELETE', '/calendars/primary/events/e1');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'DELETE',
                    body: undefined,
                }),
            );
            expect(result).toEqual({ ok: true, status: 204, data: null });
        });

        it('should handle 204 No Content without calling json()', async () => {
            const jsonSpy = vi.fn(() => { throw new SyntaxError('No body'); });
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                status: 204,
                headers: new Headers(),
                json: jsonSpy,
            });

            const result = await callCalendar('DELETE', '/calendars/primary/events/e2');

            expect(jsonSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true, status: 204, data: null });
        });

        it('should return error when no access token', async () => {
            (getGoogleAccessToken as Mock).mockReturnValue(null);

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(global.fetch).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: false, status: 401, data: null });
        });

        it('should clear token on 401 response', async () => {
            const mockSetToken = vi.fn();
            const { useAuthStore } = await import('@/features/auth/stores/authStore');
            const originalSetToken = useAuthStore.getState().setGoogleAccessToken;
            useAuthStore.setState({ setGoogleAccessToken: mockSetToken } as never);

            (global.fetch as Mock).mockResolvedValue({
                ok: false,
                status: 401,
                headers: new Headers(),
                json: () => Promise.resolve({ error: { message: 'Invalid Credentials' } }),
            });

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(result).toEqual({ ok: false, status: 401, data: null });
            expect(mockSetToken).toHaveBeenCalledWith(null);

            useAuthStore.setState({ setGoogleAccessToken: originalSetToken } as never);
        });

        it('should handle network errors gracefully', async () => {
            (global.fetch as Mock).mockRejectedValue(new TypeError('Failed to fetch'));

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(result).toEqual({ ok: false, status: 0, data: null });
        });

        it('should handle API error responses', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: false,
                status: 403,
                headers: new Headers({ 'content-length': '50' }),
                json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
            });

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(403);
            expect(result.data).toEqual({ error: { message: 'Forbidden' } });
        });

        it('should make PATCH request with body', async () => {
            const body = { summary: 'Updated standup' };
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-length': '42' }),
                json: () => Promise.resolve({ id: 'event-1' }),
            });

            await callCalendar('PATCH', '/calendars/primary/events/e1', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify(body),
                }),
            );
        });
        it('should return error on fetch abort (timeout)', async () => {
            const abortError = new DOMException('The operation was aborted', 'AbortError');
            (global.fetch as Mock).mockRejectedValue(abortError);

            const result = await callCalendar('GET', '/calendars/primary/events');

            expect(result).toEqual({ ok: false, status: 0, data: null });
        });
    });

    describe('isCalendarAvailable', () => {
        it('should return true when token exists', () => {
            (getGoogleAccessToken as Mock).mockReturnValue(mockToken);
            expect(isCalendarAvailable()).toBe(true);
        });

        it('should return false when no token', () => {
            (getGoogleAccessToken as Mock).mockReturnValue(null);
            expect(isCalendarAvailable()).toBe(false);
        });
    });
});
