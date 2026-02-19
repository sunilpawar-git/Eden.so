/**
 * useIdeaCardCalendar - Calendar badge interaction for IdeaCard
 * Handles retry on failed syncs and cleanup when node is deleted
 */
import { useCallback } from 'react';
import { useCalendarSync } from './useCalendarSync';
import { deleteEvent } from '../services/calendarService';
import type { CalendarEventMetadata } from '../types/calendarEvent';

interface UseIdeaCardCalendarOptions {
    nodeId: string;
    calendarEvent?: CalendarEventMetadata;
}

export function useIdeaCardCalendar({ nodeId, calendarEvent }: UseIdeaCardCalendarOptions) {
    const sync = useCalendarSync(nodeId);

    const handleRetry = useCallback(async () => {
        if (!calendarEvent) return;
        const { id, type, title, date, endDate, notes } = calendarEvent;
        if (id) {
            await sync.syncUpdate(id, type, title, date, endDate, notes);
        } else {
            await sync.syncCreate(type, title, date, endDate, notes);
        }
    }, [calendarEvent, sync]);

    const cleanupOnDelete = useCallback(() => {
        if (!calendarEvent?.id) return;
        void deleteEvent(calendarEvent.id).catch(() => undefined);
    }, [calendarEvent]);

    return { handleRetry, cleanupOnDelete, isLoading: sync.isLoading };
}
