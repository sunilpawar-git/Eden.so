/**
 * calendarIntentService Tests - looksLikeCalendarIntent (heuristic pre-check)
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: vi.fn(),
    isGeminiAvailable: vi.fn(() => true),
    extractGeminiText: vi.fn(),
}));

// eslint-disable-next-line import-x/first
import { isGeminiAvailable } from '@/features/knowledgeBank/services/geminiClient';
// eslint-disable-next-line import-x/first
import { looksLikeCalendarIntent } from '../services/calendarIntentService';

describe('calendarIntentService looksLikeCalendarIntent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isGeminiAvailable as Mock).mockReturnValue(true);
    });

    describe('looksLikeCalendarIntent', () => {
        it.each([
            'Remind me to call Mama at 9pm',
            'Schedule meeting with Max tomorrow',
            'Create an event for Friday at 3pm',
            'Todo: buy groceries',
            'Set a reminder for dentist appointment',
            'Book a call with John next Monday',
            'I have an appointment at 10am',
            'What is my schedule for today?',
            'Read my calendar',
            'Show my events for tomorrow',
            'Whats on the agenda today'
        ])('should return true for: %s', (prompt) => {
            expect(looksLikeCalendarIntent(prompt)).toBe(true);
        });

        it.each([
            'Write a poem about the ocean',
            'Explain quantum mechanics',
            'Summarize this article',
            'What is the capital of France?',
            'Help me debug this code',
        ])('should return false for: %s', (prompt) => {
            expect(looksLikeCalendarIntent(prompt)).toBe(false);
        });
    });
});
