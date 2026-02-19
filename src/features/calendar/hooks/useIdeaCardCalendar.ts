/**
 * useIdeaCardCalendar - Calendar badge interaction for IdeaCard
 * Handles retry on failed/pending syncs and cleanup when node is deleted.
 * Pending items (no token at creation) trigger re-auth on retry (user gesture).
 */
import { useCallback } from 'react';
import { useCalendarSync } from './useCalendarSync';
import { isCalendarAvailable } from '../services/calendarClient';
import { reauthenticateForCalendar } from '@/features/auth/services/authService';
import type { CalendarEventMetadata } from '../types/calendarEvent';

interface UseIdeaCardCalendarOptions {
    nodeId: string;
    calendarEvent?: CalendarEventMetadata;
}

export function useIdeaCardCalendar({ nodeId, calendarEvent }: UseIdeaCardCalendarOptions) {
    const { syncCreate, syncUpdate, syncDelete, isLoading } = useCalendarSync(nodeId);

    const handleRetry = useCallback(async () => {
        if (!calendarEvent) return;
        const { id, type, title, date, endDate, notes } = calendarEvent;

        if (!isCalendarAvailable()) {
            const ok = await reauthenticateForCalendar();
            if (!ok) return;
        }

        if (id) {
            await syncUpdate(id, type, title, date, endDate, notes);
        } else {
            await syncCreate(type, title, date, endDate, notes);
        }
    }, [calendarEvent, syncCreate, syncUpdate]);

    const cleanupOnDelete = useCallback(() => {
        if (!calendarEvent?.id) return;
        void syncDelete().catch(() => undefined);
    }, [calendarEvent, syncDelete]);

    return { handleRetry, cleanupOnDelete, isLoading };
}
