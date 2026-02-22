import { useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { useSidebarWorkspaces } from '@/shared/hooks/useSidebarWorkspaces';
import { PlusIcon, ChevronDownIcon } from '@/shared/components/icons';
import { WorkspaceList } from './WorkspaceList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import styles from './Sidebar.module.css';

interface SidebarProps {
    onSettingsClick?: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
    const {
        workspaces,
        currentWorkspaceId,
        isCreating,
        isCreatingDivider,
        handleNewWorkspace,
        handleNewDivider,
        handleDeleteDivider,
        handleSelectWorkspace,
        handleRenameWorkspace,
        handleReorderWorkspace,
    } = useSidebarWorkspaces();

    const isPinned = useSidebarStore((s) => s.isPinned);
    const togglePin = useSidebarStore((s) => s.togglePin);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useOutsideClick(dropdownRef, isDropdownOpen, () => setIsDropdownOpen(false));

    const onAddDivider = () => {
        setIsDropdownOpen(false);
        void handleNewDivider();
    };

    return (
        <aside
            className={styles.sidebar}
            data-pinned={String(isPinned)}
            data-open={String(isHoverOpen)}
            aria-label={strings.sidebar.ariaLabel}
        >
            <SidebarHeader isPinned={isPinned} isHoverOpen={isHoverOpen} onTogglePin={togglePin} />

            <div className={styles.workspaces}>
                <div className={styles.newWorkspaceWrapper} ref={dropdownRef}>
                    <div className={styles.splitButtonContainer}>
                        <button
                            className={styles.newWorkspaceMain}
                            onClick={handleNewWorkspace}
                            disabled={isCreating || isCreatingDivider}
                        >
                            <PlusIcon size={18} />
                            <span>{isCreating ? strings.common.loading : strings.workspace.newWorkspace}</span>
                        </button>
                        <div className={styles.splitDivider} />
                        <button
                            className={styles.newWorkspaceDropdown}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isCreating || isCreatingDivider}
                            aria-label="New Workspace Options"
                            aria-expanded={isDropdownOpen}
                        >
                            <ChevronDownIcon size={18} />
                        </button>
                    </div>
                    {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            <button
                                className={styles.dropdownItem}
                                onClick={onAddDivider}
                                disabled={isCreating || isCreatingDivider}
                            >
                                {isCreatingDivider ? strings.common.loading : 'Add Divider'}
                            </button>
                        </div>
                    )}
                </div>

                <WorkspaceList
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    onSelectWorkspace={handleSelectWorkspace}
                    onRenameWorkspace={handleRenameWorkspace}
                    onReorderWorkspace={handleReorderWorkspace}
                    onDeleteWorkspace={handleDeleteDivider}
                />
            </div>

            <SidebarFooter onSettingsClick={onSettingsClick} />
        </aside>
    );
}
