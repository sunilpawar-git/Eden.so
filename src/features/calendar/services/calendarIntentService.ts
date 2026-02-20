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

const VALID_TYPES = new Set<string>(['event', 'reminder', 'todo', 'read']);

/**
 * Fast local heuristic: does this prompt look like a calendar request?
 * Used as a pre-flight check before the Gemini API call so we can
 * acquire the OAuth token while still in the user-gesture context.
 */
const CALENDAR_KEYWORDS_RE = /\b(remind(?:er)?|schedule|meeting|event|appointment|call|todo|to[\s-]?do|show\s+(?:my\s+)?(?:calendar|events)|read\s+(?:my\s+)?calendar|agenda|plan|task|set\s+(?:a\s+)?(?:reminder|alarm)|book|create\s+(?:a\s+)?(?:meeting|event)|(?:what|how)\b.*?\b(?:schedule|plan|agenda|calendar)|(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))\b/i;

export function looksLikeCalendarIntent(prompt: string): boolean {
    return CALENDAR_KEYWORDS_RE.test(prompt);
}

function isValidISODate(s: string): boolean {
    const d = new Date(s);
    return !isNaN(d.getTime());
}

/** Strip markdown code fences (```json ... ```) that Gemini sometimes wraps around JSON. */
function stripCodeFences(text: string): string {
    const trimmed = text.trim();
    const fenceRe = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
    const match = fenceRe.exec(trimmed);
    return match?.[1] ? match[1].trim() : trimmed;
}

function parseIntentResponse(text: string): CalendarIntentResult | null {
    try {
        const raw = JSON.parse(stripCodeFences(text)) as RawIntentResponse;
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
            confirmation: raw.confirmation ?? (raw.type === 'read' ? cs.readConfirmationFallback : `${cs.confirmationFallback}${raw.title.trim()}`),
        };
    } catch {
        return null;
    }
}

/** Format the user's local UTC offset as ±HH:MM (e.g. "+05:30", "-08:00"). */
function getLocalUTCOffset(): string {
    const offsetMin = new Date().getTimezoneOffset();
    const sign = offsetMin <= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
}

/** Get a human-readable local datetime string (e.g. "2026-02-19T21:30:00+05:30"). */
function getLocalISOString(): string {
    const now = new Date();
    const offset = getLocalUTCOffset();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`;
}

/**
 * Detect calendar intent from a natural language prompt.
 * Returns structured calendar data or null if not a calendar request.
 */
export async function detectCalendarIntent(prompt: string): Promise<CalendarIntentResult | null> {
    if (!isGeminiAvailable()) return null;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const systemPrompt = cs.ai.intentSystemPrompt
        .replace('{{localNow}}', getLocalISOString())
        .replace('{{tz}}', tz)
        .replace('{{offset}}', getLocalUTCOffset());

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
