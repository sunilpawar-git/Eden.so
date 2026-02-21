import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processCalendarIntent } from '../services/calendarIntentHandler';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { detectCalendarIntent, looksLikeCalendarIntent } from '../services/calendarIntentService';
import { createEvent, listEvents } from '../services/calendarService';

vi.mock('@/features/canvas/stores/canvasStore', () => {
    const updateNodeOutput = vi.fn();
    const setNodeCalendarEvent = vi.fn();
    return {
        useCanvasStore: {
            getState: () => ({
                updateNodeOutput,
                setNodeCalendarEvent,
            }),
        },
    };
});

vi.mock('../services/calendarIntentService', () => ({
    detectCalendarIntent: vi.fn(),
    looksLikeCalendarIntent: vi.fn(),
}));

vi.mock('../services/calendarService', () => ({
    createEvent: vi.fn(),
    listEvents: vi.fn(),
}));

vi.mock('@/features/auth/services/calendarAuthService', () => ({
    connectGoogleCalendar: vi.fn().mockResolvedValue(false),
}));

let mockIsCalendarConnected = true;
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: {
        getState: () => ({ isCalendarConnected: mockIsCalendarConnected }),
    },
}));

describe('calendarIntentHandler', () => {
    const mockStore = useCanvasStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        mockIsCalendarConnected = true;
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
    });

    it('should process read intent by delegating to listEvents & formatting', async () => {
        (detectCalendarIntent as Mock).mockResolvedValue({
            type: 'read',
            title: 'schedule',
            date: '2026-02-20T00:00:00Z',
            endDate: '2026-02-20T23:59:59Z',
            notes: null,
            confirmation: 'Here are your events:',
        });

        (listEvents as Mock).mockResolvedValue([
            { title: 'Test Meeting', date: '2026-02-20T10:00:00.000Z' }
        ]);

        const handled = await processCalendarIntent('node1', 'read my calendar');

        expect(handled).toBe(true);
        expect(listEvents).toHaveBeenCalledWith('2026-02-20T00:00:00Z', '2026-02-20T23:59:59Z');
        expect(mockStore.updateNodeOutput).toHaveBeenCalledWith(
            'node1',
            expect.stringContaining('Test Meeting')
        );
        expect(mockStore.setNodeCalendarEvent).not.toHaveBeenCalled();
    });

    it('should process creation intents correctly via createEvent', async () => {
        (detectCalendarIntent as Mock).mockResolvedValue({
            type: 'event',
            title: 'Meet Max',
            date: '2026-02-20T10:00:00Z',
            confirmation: 'Created meeting.',
        });

        (createEvent as Mock).mockResolvedValue({
            id: 'gcal1',
            type: 'event',
            title: 'Meet Max',
            status: 'synced',
        });

        const handled = await processCalendarIntent('node2', 'meet max at 10');

        expect(handled).toBe(true);
        expect(createEvent).toHaveBeenCalledWith('event', 'Meet Max', '2026-02-20T10:00:00Z', undefined, undefined);
        expect(mockStore.setNodeCalendarEvent).toHaveBeenCalled();
        expect(mockStore.updateNodeOutput).toHaveBeenCalledWith('node2', 'Created meeting.');
    });

    it('should fallback securely on an error during reading', async () => {
        (detectCalendarIntent as Mock).mockResolvedValue({
            type: 'read',
            title: 'schedule',
            date: '2026-02-20T00:00:00Z',
            endDate: '2026-02-20T23:59:59Z',
        });

        (listEvents as Mock).mockRejectedValue(new Error('Network Error'));

        await processCalendarIntent('node3', 'read my calendar');

        expect(mockStore.updateNodeOutput).toHaveBeenCalledWith(
            'node3',
            expect.stringContaining('Failed to fetch calendar events')
        );
    });

    it('should not register a pending event for read intents when unauthenticated', async () => {
        mockIsCalendarConnected = false;
        (detectCalendarIntent as Mock).mockResolvedValue({
            type: 'read',
            title: 'schedule',
            date: '2026-02-20T00:00:00Z',
        });

        const handled = await processCalendarIntent('node4', 'read my calendar');

        expect(handled).toBe(true);
        expect(mockStore.setNodeCalendarEvent).not.toHaveBeenCalled();
        expect(mockStore.updateNodeOutput).toHaveBeenCalledWith(
            'node4',
            expect.stringContaining('Please sign in')
        );
    });
});
