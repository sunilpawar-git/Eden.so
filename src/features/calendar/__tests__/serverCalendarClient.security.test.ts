/**
 * Server Calendar Client - Security Hardening Tests
 * Tests validation of event IDs to prevent path traversal and injection attacks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/auth/services/calendarAuthService', () => ({
    getCalendarToken: vi.fn(() => 'valid-token'),
}));

vi.mock('../localization/calendarStrings', () => ({
    calendarStrings: {
        errors: {
            syncFailed: 'Sync failed',
            createFailed: 'Create failed',
            updateFailed: 'Update failed',
            deleteFailed: 'Delete failed',
            readFailed: 'Read failed',
        },
    },
}));

// eslint-disable-next-line import-x/first
import { serverUpdateEvent, serverDeleteEvent } from '../services/serverCalendarClient';

global.fetch = vi.fn();

describe('serverCalendarClient - Security Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 'test-event' }),
        });
    });

    describe('Event ID Validation - Path Traversal Protection', () => {
        it('should reject event ID with path traversal (..) attempt', async () => {
            await expect(
                serverUpdateEvent('../other-calendar', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('should reject event ID with forward slash', async () => {
            await expect(
                serverUpdateEvent('calendar/events/malicious', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('should reject event ID with URL encoding attempt', async () => {
            await expect(
                serverUpdateEvent('event%2F%2E%2E%2Fmalicious', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('should reject event ID with special characters', async () => {
            await expect(
                serverUpdateEvent('event<script>alert(1)</script>', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('should accept valid Google Calendar event ID format', async () => {
            const validEventId = 'abc123_xyz-789';
            await serverUpdateEvent(validEventId, 'event', 'Test', '2026-01-01T10:00:00Z');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/calendars/primary/events/${validEventId}`),
                expect.any(Object),
            );
        });

        it('should accept event ID with alphanumeric, dashes, and underscores', async () => {
            const validEventId = 'event_123-ABC-xyz_789';
            await serverUpdateEvent(validEventId, 'event', 'Meeting', '2026-01-01T10:00:00Z');

            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('Delete Event - Path Traversal Protection', () => {
        beforeEach(() => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                status: 204,
            });
        });

        it('should reject delete with path traversal attempt', async () => {
            await expect(serverDeleteEvent('../other-event')).rejects.toThrow('Invalid event ID');
        });

        it('should reject delete with forward slash', async () => {
            await expect(serverDeleteEvent('calendar/malicious')).rejects.toThrow('Invalid event ID');
        });

        it('should accept valid event ID for deletion', async () => {
            const validEventId = 'valid_event_123';
            await serverDeleteEvent(validEventId);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/calendars/primary/events/${validEventId}`),
                expect.objectContaining({ method: 'DELETE' }),
            );
        });
    });
});
