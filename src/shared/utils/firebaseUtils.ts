/**
 * Firebase/Firestore utilities shared across the application.
 */
import type { CollectionReference, DocumentReference } from 'firebase/firestore';
import { getDocs, writeBatch, query, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FIRESTORE_BATCH_DELETE_CAP } from '@/config/firestoreQueryConfig';

/**
 * Recursively removes undefined values from objects for Firestore compatibility.
 * Firebase rejects undefined at ANY depth.
 * Skips arrays, Dates, null, and primitive values.
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
                k,
                typeof v === 'object' && v && !Array.isArray(v) && !(v instanceof Date)
                    ? removeUndefined(v as Record<string, unknown>)
                    : v,
            ])
    ) as T;
}

/** Delete all documents in a collection using capped batch iterations */
export async function batchDeleteCollection(colRef: CollectionReference): Promise<void> {
    let snapshot = await getDocs(query(colRef, limit(FIRESTORE_BATCH_DELETE_CAP)));
    while (snapshot.size > 0) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        if (snapshot.size < FIRESTORE_BATCH_DELETE_CAP) break;
        snapshot = await getDocs(query(colRef, limit(FIRESTORE_BATCH_DELETE_CAP)));
    }
}

type BatchOp =
    | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
    | { type: 'delete'; ref: DocumentReference };

/**
 * Execute an array of write operations in chunked batches of 500.
 * Safe for any number of operations (Firestore limit: 500 per batch).
 */
export async function chunkedBatchWrite(ops: BatchOp[]): Promise<void> {
    const CHUNK = FIRESTORE_BATCH_DELETE_CAP;
    for (let i = 0; i < ops.length; i += CHUNK) {
        const chunk = ops.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        for (const op of chunk) {
            if (op.type === 'set') batch.set(op.ref, op.data);
            else batch.delete(op.ref);
        }
        await batch.commit();
    }
}
