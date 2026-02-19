/**
 * useCalendarSync - Bridge between calendar service and Zustand store
 * Handles loading state, errors, and store updates for calendar CRUD
 */
import { useState, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { createEvent, deleteEvent, updateEvent } from '../services/calendarService';
import { calendarStrings as cs } from '../localization/calendarStrings';
import type { CalendarEventType } from '../types/calendarEvent';

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
            setError(msg);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, {
                id: '', type, title, date, endDate, notes,
                status: 'failed', calendarId: 'primary', error: msg,
            });
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
            setError(msg);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, {
                id: eventId, type, title, date, endDate, notes,
                status: 'failed', calendarId: 'primary', error: msg,
            });
        } finally {
            setIsLoading(false);
        }
    }, [nodeId]);

    const syncDelete = useCallback(async () => {
        const node = useCanvasStore.getState().nodes.find(n => n.id === nodeId);
        const eventId = node?.data.calendarEvent?.id;
        if (!eventId) return;

        setIsLoading(true);
        try {
            await deleteEvent(eventId);
            useCanvasStore.getState().setNodeCalendarEvent(nodeId, undefined);
        } catch (err) {
            const msg = err instanceof Error ? err.message : cs.errors.deleteFailed;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [nodeId]);

    return { isLoading, error, syncCreate, syncUpdate, syncDelete };
}
