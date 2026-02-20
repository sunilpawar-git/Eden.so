import { describe, it, expect } from 'vitest';
import { formatEventsMarkdown } from '../services/calendarEventFormatter';
import { calendarStrings as cs } from '../localization/calendarStrings';

describe('formatEventsMarkdown', () => {
    it('should format empty events list', () => {
        const result = formatEventsMarkdown([]);
        expect(result).toBe(cs.readNoEventsFallback);
    });

    it('should format events correctly with time zone local processing', () => {
        // We use mocked specific hours via Date object strings to verify format Time
        const mockEvents = [
            { title: 'Project sync', date: '2026-02-20T10:00:00Z', endDate: '2026-02-20T11:30:00Z' },
            { title: 'Lunch', date: '2026-02-20T12:00:00Z', endDate: undefined },
        ];

        const result = formatEventsMarkdown(mockEvents);

        expect(result).toContain(cs.readConfirmationFallback);
        // We do not exact match the hours due to CI timezones, but we check formatting structurally
        expect(result).toMatch(/- `\d{1,2}:\d{2}(am|pm) - \d{1,2}:\d{2}(am|pm)`: \*\*Project sync\*\*/);
        expect(result).toMatch(/- `\d{1,2}:\d{2}(am|pm)`: \*\*Lunch\*\*/);
    });

    it('should correctly format All Day events and escape markdown characters in titles', () => {
        const mockEvents = [
            { title: 'Holiday *Yay*', date: '2026-12-25' },
            { title: 'Meeting [Important]', date: '2026-02-20T10:00:00Z', endDate: '2026-02-20' }
        ];

        const result = formatEventsMarkdown(mockEvents);

        expect(result).toContain('- `All Day`: **Holiday \\*Yay\\***');
        expect(result).toMatch(/- `\d{1,2}:\d{2}(am|pm)`: \*\*Meeting \\\[Important\\\]\*\*/);
    });
});
