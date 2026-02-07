/**
 * Save Status Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStatusStore } from '../saveStatusStore';

describe('SaveStatusStore', () => {
    beforeEach(() => {
        useSaveStatusStore.setState({
            status: 'idle',
            lastSavedAt: null,
            lastError: null,
        });
    });

    describe('initial state', () => {
        it('should have idle status', () => {
            expect(useSaveStatusStore.getState().status).toBe('idle');
        });

        it('should have null lastSavedAt', () => {
            expect(useSaveStatusStore.getState().lastSavedAt).toBeNull();
        });

        it('should have null lastError', () => {
            expect(useSaveStatusStore.getState().lastError).toBeNull();
        });
    });

    describe('setSaving', () => {
        it('should transition status to saving', () => {
            useSaveStatusStore.getState().setSaving();
            expect(useSaveStatusStore.getState().status).toBe('saving');
        });

        it('should clear lastError when saving starts', () => {
            useSaveStatusStore.setState({ lastError: 'previous error' });
            useSaveStatusStore.getState().setSaving();
            expect(useSaveStatusStore.getState().lastError).toBeNull();
        });
    });

    describe('setSaved', () => {
        it('should transition status to saved', () => {
            useSaveStatusStore.getState().setSaved();
            expect(useSaveStatusStore.getState().status).toBe('saved');
        });

        it('should update lastSavedAt timestamp', () => {
            const before = Date.now();
            useSaveStatusStore.getState().setSaved();
            const { lastSavedAt } = useSaveStatusStore.getState();
            expect(lastSavedAt).toBeGreaterThanOrEqual(before);
            expect(lastSavedAt).toBeLessThanOrEqual(Date.now());
        });

        it('should clear lastError on successful save', () => {
            useSaveStatusStore.setState({ lastError: 'old error' });
            useSaveStatusStore.getState().setSaved();
            expect(useSaveStatusStore.getState().lastError).toBeNull();
        });
    });

    describe('setError', () => {
        it('should transition status to error', () => {
            useSaveStatusStore.getState().setError('Network failed');
            expect(useSaveStatusStore.getState().status).toBe('error');
        });

        it('should store the error message', () => {
            useSaveStatusStore.getState().setError('Timeout');
            expect(useSaveStatusStore.getState().lastError).toBe('Timeout');
        });
    });

    describe('setQueued', () => {
        it('should transition status to queued', () => {
            useSaveStatusStore.getState().setQueued();
            expect(useSaveStatusStore.getState().status).toBe('queued');
        });
    });

    describe('setIdle', () => {
        it('should transition status to idle', () => {
            useSaveStatusStore.setState({ status: 'saved' });
            useSaveStatusStore.getState().setIdle();
            expect(useSaveStatusStore.getState().status).toBe('idle');
        });
    });
});
