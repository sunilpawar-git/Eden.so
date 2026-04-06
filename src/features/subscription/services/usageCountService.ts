/**
 * Usage Count Service — Reads AI daily generation count from Firestore.
 * Offline-safe: returns zero on any error.
 * Client reads only; server (geminiProxy) writes.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/shared/services/logger';

interface AiDailyUsage {
    readonly count: number;
    readonly date: string;
}

const EMPTY_USAGE: AiDailyUsage = { count: 0, date: '' };

/**
 * Load the current day's AI generation count from Firestore.
 * Returns { count: 0, date: '' } on error or missing document.
 */
export async function loadAiDailyCount(userId: string): Promise<AiDailyUsage> {
    try {
        const ref = doc(db, 'users', userId, 'usage', 'aiDaily');
        const snap = await getDoc(ref);

        if (!snap.exists()) return EMPTY_USAGE;

        const data = snap.data() as { count?: number; date?: string };
        const today = new Date().toISOString().slice(0, 10);

        // Only return counts for today; stale dates mean the count has reset
        if (data.date !== today) return EMPTY_USAGE;

        return { count: data.count ?? 0, date: data.date ?? '' };
    } catch (err) {
        logger.warn('[usageCountService] Failed to load AI daily count — offline fallback', err);
        return EMPTY_USAGE;
    }
}
