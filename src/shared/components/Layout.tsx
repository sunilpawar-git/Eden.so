/**
 * Main Layout - Sidebar + Canvas Area
 */
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { SearchBar } from '@/features/search';
import { WorkspaceControls } from '@/features/workspace/components/WorkspaceControls';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import styles from './Layout.module.css';

interface LayoutProps {
    children: ReactNode;
    onSettingsClick?: () => void;
}

export function Layout({ children, onSettingsClick }: LayoutProps) {
    const selectNode = useCanvasStore((s) => s.selectNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

    const handleSearchResultClick = useCallback(
        (nodeId: string, workspaceId: string) => {
            // Only navigate if in same workspace (cross-workspace nav is future scope)
            if (workspaceId === currentWorkspaceId) {
                clearSelection();
                selectNode(nodeId);
            }
        },
        [selectNode, clearSelection, currentWorkspaceId]
    );

    return (
        <div className={styles.layout}>
            <Sidebar onSettingsClick={onSettingsClick} />
            <div className={styles.mainArea}>
                <header className={styles.topBar}>
                    <SearchBar onResultClick={handleSearchResultClick} />
                    <WorkspaceControls />
                </header>
                <main className={styles.main}>{children}</main>
            </div>
        </div>
    );
}
