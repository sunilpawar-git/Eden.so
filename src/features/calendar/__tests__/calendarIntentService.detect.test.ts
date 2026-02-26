/**
 * calendarIntentService Tests - detectCalendarIntent (AI-powered intent detection)
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: vi.fn(),
    isGeminiAvailable: vi.fn(() => true),
    extractGeminiText: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { callGemini, isGeminiAvailable, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';
// eslint-disable-next-line import-x/first
import { detectCalendarIntent } from '../services/calendarIntentService';

function mockGeminiResponse(text: string) {
    (callGemini as Mock).mockResolvedValue({ ok: true, status: 200, data: {} });
    (extractGeminiText as Mock).mockReturnValue(text);
}

describe('calendarIntentService detectCalendarIntent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isGeminiAvailable as Mock).mockReturnValue(true);
    });

    it('should detect a reminder intent', async () => {
        mockGeminiResponse(JSON.stringify({
            isCalendar: true,
            type: 'reminder',
            title: 'Call Mama',
            date: '2026-02-19T21:00:00.000Z',
            endDate: null,
            notes: null,
            confirmation: 'OK. I\'ll remind you to call Mama today at 9pm.',
        }));

        const result = await detectCalendarIntent('Remind me to call Mama today at 9pm');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('reminder');
        expect(result?.title).toBe('Call Mama');
        expect(result?.confirmation).toContain('call Mama');
    });

    it('should detect an event intent', async () => {
        mockGeminiResponse(JSON.stringify({
            isCalendar: true,
            type: 'event',
            title: 'Team standup',
            date: '2026-02-24T09:00:00.000Z',
            endDate: '2026-02-24T09:30:00.000Z',
            notes: null,
            confirmation: 'OK. Scheduled Team standup for next Monday at 9am.',
        }));

        const result = await detectCalendarIntent('Schedule team standup next Monday 9am');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('event');
        expect(result?.endDate).toBe('2026-02-24T09:30:00.000Z');
    });

    it('should detect a todo intent', async () => {
        mockGeminiResponse(JSON.stringify({
            isCalendar: true,
            type: 'todo',
            title: 'Buy groceries',
            date: '2026-02-20T09:00:00.000Z',
            endDate: null,
            notes: null,
            confirmation: 'OK. Added todo: Buy groceries for tomorrow.',
        }));

        const result = await detectCalendarIntent('Todo: buy groceries tomorrow');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('todo');
    });

    it('should detect a read intent', async () => {
        mockGeminiResponse(JSON.stringify({
            isCalendar: true,
            type: 'read',
            title: 'schedule',
            date: '2026-02-20T00:00:00.000Z',
            endDate: '2026-02-20T23:59:59.000Z',
            notes: null,
            confirmation: 'Here are your events:',
        }));

        const result = await detectCalendarIntent('What is my schedule today?');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('read');
        expect(result?.date).toBe('2026-02-20T00:00:00.000Z');
        expect(result?.endDate).toBe('2026-02-20T23:59:59.000Z');
        expect(result?.confirmation).toBe('Here are your events:');
    });

    it('should return null for non-calendar prompts', async () => {
        mockGeminiResponse(JSON.stringify({ isCalendar: false }));

        const result = await detectCalendarIntent('Write a poem about the ocean');

        expect(result).toBeNull();
    });

    it('should parse JSON wrapped in markdown code fences', async () => {
        mockGeminiResponse(`\`\`\`json\n${JSON.stringify({
            isCalendar: true,
            type: 'reminder',
            title: 'Buy groceries',
            date: '2026-02-20T18:00:00.000Z',
            endDate: null,
            notes: null,
            confirmation: 'OK. Reminder set.',
        })}\n\`\`\``);

        const result = await detectCalendarIntent('Remind me to buy groceries at 6pm');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('reminder');
        expect(result?.title).toBe('Buy groceries');
    });

    it('should parse JSON wrapped in plain code fences', async () => {
        mockGeminiResponse(`\`\`\`\n${JSON.stringify({
            isCalendar: true,
            type: 'event',
            title: 'Meeting',
            date: '2026-02-20T10:00:00.000Z',
            confirmation: 'OK.',
        })}\n\`\`\``);

        const result = await detectCalendarIntent('Schedule meeting');

        expect(result).not.toBeNull();
        expect(result?.type).toBe('event');
    });

    it('should pass the prompt to Gemini', async () => {
        mockGeminiResponse(JSON.stringify({ isCalendar: false }));

        await detectCalendarIntent('Remind me to call Mama');

        expect(callGemini).toHaveBeenCalledTimes(1);
        const body = (callGemini as Mock).mock.calls[0]?.[0];
        expect(body.contents[0].parts[0].text).toContain('Remind me to call Mama');
    });
});
