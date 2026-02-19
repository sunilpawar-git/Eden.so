/**
 * Calendar String Resources
 * Extracted from main strings.ts to respect 300-line file limit
 */
export const calendarStrings = {
    badge: {
        retry: 'Retry sync',
        viewEvent: 'View event details',
    },
    errors: {
        createFailed: 'Failed to create calendar event. Please try again.',
        noToken: 'Sign in with Google to use calendar features.',
        invalidTitle: 'Title must be between 1 and 200 characters.',
        invalidDate: 'Please enter a valid date.',
        endBeforeStart: 'End date must be after start date.',
        dateTooFar: 'Date cannot be more than 10 years in the future.',
        notesTooLong: 'Notes cannot exceed 5000 characters.',
    },
    ai: {
        intentSystemPrompt: `You are a calendar intent detector. Analyze the user's text and determine if it contains a calendar event, reminder, or todo request.

Current date/time: {{now}}

If the text IS a calendar/reminder/todo request, respond with ONLY this JSON:
{"isCalendar":true,"type":"event|reminder|todo","title":"extracted title","date":"ISO 8601 datetime","endDate":"ISO 8601 datetime or null","notes":"any extra details or null","confirmation":"natural confirmation message"}

If the text is NOT a calendar request, respond with ONLY:
{"isCalendar":false}

Rules:
- "remind me" or "reminder" → type "reminder"
- "todo", "task", "to do", "to-do" → type "todo"
- "meeting", "schedule", "event", "appointment", "call" → type "event"
- Parse relative dates: "today", "tomorrow", "next Monday", "in 2 hours"
- Default time to 09:00 if not specified
- Default event duration to 30 minutes
- The confirmation should be natural and concise, e.g. "OK. I'll remind you to call Mama today at 9pm."
- Respond with ONLY valid JSON, no markdown, no explanation`,
    },
} as const;
