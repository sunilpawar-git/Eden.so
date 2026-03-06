/**
 * useCalendarSync - Bridge between calendar service and Zustand store
 * Handles loading state, errors, and store updates for calendar CRUD
 */
import { useState, useCallback } from 'react';
import { useCanvasStore, getNodeMap } from '@/features/canvas/stores/canvasStore';
import { createEvent, deleteEvent, updateEvent } from '../services/calendarService';
import { calendarStrings as cs } from '../localization/calendarStrings';
import type { CalendarEventType, CalendarEventMetadata } from '../types/calendarEvent';
import { disconnectGoogleCalendar } from '@/features/auth/services/calendarAuthService';
import { REAUTH_REQUIRED } from '../services/serverCalendarClient';
import { toast } from '@/shared/stores/toastStore';

/** Handle calendar sync errors: REAUTH_REQUIRED triggers disconnect, others set error msg. */
function handleCalendarSyncError(
    msg: string,
    setError: (m: string) => void,
    nodeId: string,
    failedBase: Omit<CalendarEventMetadata, 'status' | 'calendarId' | 'error'>
): void {
    const errorMsg = msg === REAUTH_REQUIRED ? cs.errors.sessionExpired : msg;
    if (msg === REAUTH_REQUIRED) {
        disconnectGoogleCalendar();
        toast.error(cs.errors.sessionExpired);
    }
    setError(errorMsg);
    useCanvasStore.getState().setNodeCalendarEvent(nodeId, {
        ...failedBase,
        status: 'failed',
        calendarId: 'primary',
        error: errorMsg,
    });
}

/** Handle delete-only errors (no failed-event payload needed). */
function handleDeleteSyncError(msg: string, setError: (m: string) => void): void {
    if (msg === REAUTH_REQUIRED) {
        disconnectGoogleCalendar();
        toast.error(cs.errors.sessionExpired);
        setError(cs.errors.sessionExpired);
    } else {
        setError(msg);
    }
}

export function useCalendarSync(nodeId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const syncCreate = useCallback(async (
        type: CalendarEventType, title: string, date: string,
        endDate?: string, notes?: string,
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const metadata = await createEvent(type, title, date, endDate, notes);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, metadata);
        } catch (err) {
            const msg = err instanceof Error ? err.message : cs.errors.syncFailed;
            handleCalendarSyncError(msg, setError, nodeId, { id: '', type, title, date, endDate, notes });
        } finally {
            setIsLoading(false);
        }
    }, [nodeId]);

    const syncUpdate = useCallback(async (
        eventId: string, type: CalendarEventType, title: string,
        date: string, endDate?: string, notes?: string,
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const metadata = await updateEvent(eventId, type, title, date, endDate, notes);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, metadata);
        } catch (err) {
            const msg = err instanceof Error ? err.message : cs.errors.updateFailed;
            handleCalendarSyncError(msg, setError, nodeId, { id: eventId, type, title, date, endDate, notes });
        } finally {
            setIsLoading(false);
        }
    }, [nodeId]);

    const syncDelete = useCallback(async () => {
        const node = getNodeMap(useCanvasStore.getState().nodes).get(nodeId);
        const eventId = node?.data.calendarEvent?.id;
        if (!eventId) return;

        setIsLoading(true);
        try {
            await deleteEvent(eventId);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, undefined);
        } catch (err) {
            const msg = err instanceof Error ? err.message : cs.errors.deleteFailed;
            handleDeleteSyncError(msg, setError);
        } finally {
            setIsLoading(false);
        }
    }, [nodeId]);

    return { isLoading, error, syncCreate, syncUpdate, syncDelete };
}
