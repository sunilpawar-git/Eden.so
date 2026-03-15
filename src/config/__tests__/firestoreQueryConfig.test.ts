/**
 * Firestore Query Config — Unit tests
 */
import { describe, it, expect } from 'vitest';
import {
    FIRESTORE_QUERY_CAP,
    FIRESTORE_BATCH_DELETE_CAP,
    WORKSPACE_LIST_CAP,
    KB_ENTRIES_CAP,
} from '../firestoreQueryConfig';

describe('firestoreQueryConfig', () => {
    it('all caps are positive integers', () => {
        for (const cap of [FIRESTORE_QUERY_CAP, FIRESTORE_BATCH_DELETE_CAP, WORKSPACE_LIST_CAP, KB_ENTRIES_CAP]) {
            expect(cap).toBeGreaterThan(0);
            expect(Number.isInteger(cap)).toBe(true);
        }
    });

    it('BATCH_DELETE_CAP <= QUERY_CAP', () => {
        expect(FIRESTORE_BATCH_DELETE_CAP).toBeLessThanOrEqual(FIRESTORE_QUERY_CAP);
    });

    it('KB_ENTRIES_CAP <= QUERY_CAP', () => {
        expect(KB_ENTRIES_CAP).toBeLessThanOrEqual(FIRESTORE_QUERY_CAP);
    });

    it('WORKSPACE_LIST_CAP <= QUERY_CAP', () => {
        expect(WORKSPACE_LIST_CAP).toBeLessThanOrEqual(FIRESTORE_QUERY_CAP);
    });
});
