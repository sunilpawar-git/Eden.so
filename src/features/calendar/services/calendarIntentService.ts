/**
 * Calendar Intent Service - AI-powered calendar intent detection
 * Uses Gemini to parse natural language into structured calendar data
 */
import {
    callGemini, isGeminiAvailable, extractGeminiText,
} from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';
import { calendarStrings as cs } from '../localization/calendarStrings';
import type { CalendarEventType } from '../types/calendarEvent';

export interface CalendarIntentResult {
    type: CalendarEventType;
    title: string;
    date: string;
    endDate?: string;
    notes?: string;
    confirmation: string;
}

interface RawIntentResponse {
    isCalendar: boolean;
    type?: string;
    title?: string;
    date?: string;
    endDate?: string | null;
    notes?: string | null;
    confirmation?: string;
}

const VALID_TYPES = new Set<string>(['event', 'reminder', 'todo']);

function isValidISODate(s: string): boolean {
    const d = new Date(s);
    return !isNaN(d.getTime());
}

function parseIntentResponse(text: string): CalendarIntentResult | null {
    try {
        const raw = JSON.parse(text) as RawIntentResponse;
        if (!raw.isCalendar) return null;
        if (!raw.type || !VALID_TYPES.has(raw.type)) return null;
        if (!raw.title || raw.title.trim().length === 0) return null;
        if (!raw.date || !isValidISODate(raw.date)) return null;

        return {
            type: raw.type as CalendarEventType,
            title: raw.title.trim(),
            date: raw.date,
            endDate: raw.endDate && isValidISODate(raw.endDate) ? raw.endDate : undefined,
            notes: raw.notes ?? undefined,
            confirmation: raw.confirmation ?? `OK. Created: ${raw.title.trim()}`,
        };
    } catch {
        return null;
    }
}

/**
 * Detect calendar intent from a natural language prompt.
 * Returns structured calendar data or null if not a calendar request.
 */
export async function detectCalendarIntent(prompt: string): Promise<CalendarIntentResult | null> {
    if (!isGeminiAvailable()) return null;

    const systemPrompt = cs.ai.intentSystemPrompt.replace('{{now}}', new Date().toISOString());

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const result = await callGemini(body);
    if (!result.ok) return null;

    const text = extractGeminiText(result.data);
    if (!text) return null;

    return parseIntentResponse(text);
}
