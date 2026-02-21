/**
 * Calendar Markdown Formatter
 * Extracted from formatCalendarEvents helper to keep IntentHandler slim and modular.
 */
import { calendarStrings as cs } from '../localization/calendarStrings';

export interface FormattedEvent {
    title: string;
    date: string;
    endDate?: string;
}

function escapeMarkdown(text: string): string {
    return text.replace(/([*_~`[\]])/g, '\\$1');
}

function formatTime(isoString: string): string {
    if (!isoString.includes('T')) return 'All Day';

    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes}${ampm}`;
}

export function formatEventsMarkdown(events: FormattedEvent[]): string {
    if (events.length === 0) {
        return cs.readNoEventsFallback;
    }

    let markdown = `${cs.readConfirmationFallback}\n\n`;

    events.forEach((event) => {
        const startTime = formatTime(event.date);
        const hasEndDate = event.endDate !== undefined && event.endDate.length > 0;
        const endTime = hasEndDate ? formatTime(event.endDate ?? '') : '';

        let timeStr = startTime;
        if (startTime === 'All Day') {
            timeStr = 'All Day';
        } else if (endTime.length > 0 && endTime !== 'All Day') {
            timeStr = `${startTime} - ${endTime}`;
        }

        // Use backticks to avoid issues with md syntax like asterisks
        markdown += `- \`${timeStr}\`: **${escapeMarkdown(event.title)}**\n`;
    });

    return markdown;
}
