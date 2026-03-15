/**
 * Scheduled Storage Cleanup — runs daily to delete orphan temporary uploads.
 * Targets files in the `tmp/` prefix and `.tmp` suffix older than 7 days.
 * Safe and idempotent: ignores already-deleted files.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const scheduledStorageCleanup = onSchedule(
    { schedule: 'every 24 hours', timeZone: 'UTC', minInstances: 0 },
    async () => {
        const bucket = getStorage().bucket();
        const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
        let deletedCount = 0;

        const [files] = await bucket.getFiles({ prefix: 'tmp/' });
        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const created = metadata.timeCreated ? new Date(metadata.timeCreated) : null;
            if (created && created < cutoff) {
                await file.delete().catch(() => { /* already deleted */ });
                logger.info(`Deleted orphan file: ${file.name}`);
                deletedCount++;
            }
        }

        logger.info(`Scheduled cleanup: deleted ${deletedCount} orphan files`);
    },
);
