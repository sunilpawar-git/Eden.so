/**
 * calendarIntentService detectCalendarIntent Edge Cases — null, validation, API failures
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

describe('calendarIntentService detectCalendarIntent edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isGeminiAvailable as Mock).mockReturnValue(true);
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

    it('should include timezone info in system prompt', async () => {
        mockGeminiResponse(JSON.stringify({ isCalendar: false }));

        await detectCalendarIntent('Remind me at 5pm');

        const body = (callGemini as Mock).mock.calls[0]?.[0];
        const sysText = body.systemInstruction.parts[0].text as string;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(sysText).toContain(tz);
        expect(sysText).toMatch(/UTC offset: [+-]\d{2}:\d{2}/);
        expect(sysText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
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
