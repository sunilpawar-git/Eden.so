/**
 * Helpers for workspace switching - non-blocking side-effects extracted
 * from useWorkspaceSwitcher to keep the hook focused.
 */

/** Load Knowledge Bank entries for a workspace (non-blocking, fire-and-forget) */
export async function loadWorkspaceKB(userId: string, workspaceId: string): Promise<void> {
    try {
        const { loadKBEntries } = await import('@/features/knowledgeBank/services/knowledgeBankService');
        const { useKnowledgeBankStore } = await import('@/features/knowledgeBank/stores/knowledgeBankStore');
        const kbEntries = await loadKBEntries(userId, workspaceId);
        useKnowledgeBankStore.getState().setEntries(kbEntries);
    } catch (err: unknown) {
        console.error('[loadWorkspaceKB] KB load failed:', err);
    }
}
