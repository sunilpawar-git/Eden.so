/**
 * App Check token verification utility for onRequest Cloud Functions.
 * onCall functions use the built-in `enforceAppCheck: true` option instead.
 *
 * Usage:
 *   const appCheckOk = await verifyAppCheckToken(req);
 *   if (!appCheckOk) { res.status(401).json({ error: 'App Check failed' }); return; }
 */
import { getAppCheck } from 'firebase-admin/app-check';
import type { Request } from 'firebase-functions/v2/https';

/**
 * Verifies the Firebase App Check token from the X-Firebase-AppCheck header.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifyAppCheckToken(req: Request): Promise<boolean> {
    const token = req.headers['x-firebase-appcheck'];
    if (!token || typeof token !== 'string') return false;
    try {
        await getAppCheck().verifyToken(token);
        return true;
    } catch {
        return false;
    }
}
