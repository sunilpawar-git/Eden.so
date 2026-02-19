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
        updateFailed: 'Failed to update calendar event. Please try again.',
        deleteFailed: 'Failed to delete calendar event.',
        syncFailed: 'Calendar sync failed. Please try again.',
        noToken: 'Sign in with Google to use calendar features.',
        noTokenRetry: 'Tap the ⏳ badge and hit retry to sync to Google Calendar.',
        invalidTitle: 'Title must be between 1 and 200 characters.',
        invalidDate: 'Please enter a valid date.',
        endBeforeStart: 'End date must be after start date.',
        dateTooFar: 'Date cannot be more than 10 years in the future.',
        notesTooLong: 'Notes cannot exceed 5000 characters.',
    },
    confirmationFallback: 'OK. Created: ',
    ai: {
        intentSystemPrompt: `You are a calendar intent detector. Analyze the user's text and determine if it contains a calendar event, reminder, or todo request.

Current date/time in user's local timezone: {{localNow}}
User's timezone: {{tz}} (UTC offset: {{offset}})

If the text IS a calendar/reminder/todo request, respond with ONLY this JSON:
{"isCalendar":true,"type":"event|reminder|todo","title":"extracted title","date":"ISO 8601 datetime with offset","endDate":"ISO 8601 datetime with offset or null","notes":"any extra details or null","confirmation":"natural confirmation message"}

If the text is NOT a calendar request, respond with ONLY:
{"isCalendar":false}

Rules:
- "remind me" or "reminder" → type "reminder"
- "todo", "task", "to do", "to-do" → type "todo"
- "meeting", "schedule", "event", "appointment", "call" → type "event"
- Parse relative dates: "today", "tomorrow", "next Monday", "in 2 hours"
- Default time to 09:00 local time if not specified
- Default event duration to 30 minutes
- CRITICAL: All times the user mentions are in their LOCAL timezone ({{tz}}). Output ISO 8601 datetimes with the user's UTC offset (e.g. "2026-02-20T17:00:00+05:30"), NOT in UTC/Z.
- The confirmation should be natural and concise, e.g. "OK. I'll remind you to call Mama today at 9pm."
- Respond with ONLY valid JSON, no markdown, no explanation`,
    },
} as const;
