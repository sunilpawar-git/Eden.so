import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CHUNK_SIZE = 500;

export async function updateWorkspaceOrder(
    userId: string,
    updates: Array<{ id: string; orderIndex: number }>
): Promise<void> {
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(({ id, orderIndex }) => {
            const workspaceRef = doc(db, 'users', userId, 'workspaces', id);
            batch.update(workspaceRef, {
                orderIndex,
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
    }
}
