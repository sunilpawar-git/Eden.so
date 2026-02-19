/**
 * calendarIntentService Tests - TDD: Written FIRST (RED phase)
 * Tests AI-powered calendar intent detection from natural language prompts
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

describe('calendarIntentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isGeminiAvailable as Mock).mockReturnValue(true);
    });

    describe('detectCalendarIntent', () => {
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

        it('should return null for non-calendar prompts', async () => {
            mockGeminiResponse(JSON.stringify({ isCalendar: false }));

            const result = await detectCalendarIntent('Write a poem about the ocean');

            expect(result).toBeNull();
        });

        it('should return null when Gemini is not available', async () => {
            (isGeminiAvailable as Mock).mockReturnValue(false);

            const result = await detectCalendarIntent('Remind me to call');

            expect(result).toBeNull();
            expect(callGemini).not.toHaveBeenCalled();
        });

        it('should return null on invalid JSON response', async () => {
            mockGeminiResponse('not valid json at all');

            const result = await detectCalendarIntent('Remind me to call');

            expect(result).toBeNull();
        });

        it('should return null when API call fails', async () => {
            (callGemini as Mock).mockResolvedValue({ ok: false, status: 500, data: null });

            const result = await detectCalendarIntent('Remind me to call');

            expect(result).toBeNull();
        });

        it('should return null when response has no text', async () => {
            (callGemini as Mock).mockResolvedValue({ ok: true, status: 200, data: {} });
            (extractGeminiText as Mock).mockReturnValue(null);

            const result = await detectCalendarIntent('Remind me to call');

            expect(result).toBeNull();
        });

        it('should return null when title is missing', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'reminder',
                title: '',
                date: '2026-02-19T21:00:00.000Z',
                confirmation: 'OK.',
            }));

            const result = await detectCalendarIntent('Remind me to ...');

            expect(result).toBeNull();
        });

        it('should return null when date is invalid', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'event',
                title: 'Meeting',
                date: 'not-a-date',
                confirmation: 'OK.',
            }));

            const result = await detectCalendarIntent('Meeting sometime');

            expect(result).toBeNull();
        });

        it('should pass the prompt to Gemini', async () => {
            mockGeminiResponse(JSON.stringify({ isCalendar: false }));

            await detectCalendarIntent('Remind me to call Mama');

            expect(callGemini).toHaveBeenCalledTimes(1);
            const body = (callGemini as Mock).mock.calls[0]?.[0];
            expect(body.contents[0].parts[0].text).toContain('Remind me to call Mama');
        });

        it('should use low temperature for deterministic output', async () => {
            mockGeminiResponse(JSON.stringify({ isCalendar: false }));

            await detectCalendarIntent('Some prompt');

            const body = (callGemini as Mock).mock.calls[0]?.[0];
            expect(body.generationConfig.temperature).toBeLessThanOrEqual(0.2);
        });

        it('should return null for invalid type value', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'meeting',
                title: 'Sync',
                date: '2026-02-20T09:00:00.000Z',
                confirmation: 'OK.',
            }));

            const result = await detectCalendarIntent('meeting with team');
            expect(result).toBeNull();
        });

        it('should return null for empty prompt', async () => {
            mockGeminiResponse(JSON.stringify({ isCalendar: false }));

            const result = await detectCalendarIntent('');
            expect(result).toBeNull();
        });

        it('should return null for whitespace-only title', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'todo',
                title: '   ',
                date: '2026-02-20T09:00:00.000Z',
                confirmation: 'OK.',
            }));

            const result = await detectCalendarIntent('todo:    ');
            expect(result).toBeNull();
        });

        it('should use default confirmation when field is missing', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'event',
                title: 'Standup',
                date: '2026-02-20T09:00:00.000Z',
            }));

            const result = await detectCalendarIntent('Standup tomorrow');
            expect(result?.confirmation).toBe('OK. Created: Standup');
        });

        it('should drop invalid endDate but keep valid date', async () => {
            mockGeminiResponse(JSON.stringify({
                isCalendar: true,
                type: 'event',
                title: 'Standup',
                date: '2026-02-20T09:00:00.000Z',
                endDate: 'not-a-date',
                confirmation: 'OK.',
            }));

            const result = await detectCalendarIntent('Standup tomorrow');
            expect(result).not.toBeNull();
            expect(result?.date).toBe('2026-02-20T09:00:00.000Z');
            expect(result?.endDate).toBeUndefined();
        });
    });
});
