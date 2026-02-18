/**
 * Sidebar Component - Workspace list and navigation
 */
import { strings } from '@/shared/localization/strings';
import { PlusIcon, SettingsIcon, PinIcon, PinOffIcon, AppLogoIcon } from '@/shared/components/icons';
import { WorkspaceItem } from './WorkspaceItem';
import { useSidebarViewModel } from './useSidebarViewModel';
import styles from './Sidebar.module.css';

interface SidebarProps {
    onSettingsClick?: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
    const {
        isPinned,
        isExpanded,
        togglePin,
        onMouseEnter,
        onMouseLeave,
        user,
        workspaces,
        currentWorkspaceId,
        isCreating,
        handleSignOut,
        handleNewWorkspace,
        handleSelectWorkspace,
        handleRenameWorkspace,
    } = useSidebarViewModel();

    return (
        <aside
            className={`${styles.sidebar} ${!isPinned ? styles.unpinned : ''} ${isExpanded ? styles.expanded : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className={styles.innerContent}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <AppLogoIcon />
                    </div>
                    <span className={styles.appName}>{strings.app.name}</span>
                    <button
                        className={styles.pinButton}
                        onClick={togglePin}
                        aria-label={isPinned ? strings.sidebar.unpin : strings.sidebar.pin}
                        title={isPinned ? strings.sidebar.unpin : strings.sidebar.pin}
                    >
                        {isPinned ? <PinIcon size={18} /> : <PinOffIcon size={18} />}
                    </button>
                </div>

                <div className={styles.workspaces}>
                    <button
                        className={styles.newWorkspace}
                        onClick={handleNewWorkspace}
                        disabled={isCreating}
                    >
                        <PlusIcon size={18} />
                        <span>{isCreating ? strings.common.loading : strings.workspace.newWorkspace}</span>
                    </button>

                    <div className={styles.workspaceList}>
                        {workspaces.length > 0 ? (
                            workspaces.map((ws) => (
                                <WorkspaceItem
                                    key={ws.id}
                                    id={ws.id}
                                    name={ws.name}
                                    isActive={ws.id === currentWorkspaceId}
                                    onSelect={handleSelectWorkspace}
                                    onRename={handleRenameWorkspace}
                                />
                            ))
                        ) : (
                            <div className={styles.workspaceItem}>
                                <span className={styles.workspaceName}>
                                    {strings.workspace.untitled}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    {user && (
                        <div className={styles.footerContent}>
                            <div className={styles.userSection}>
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className={styles.avatar}
                                    />
                                ) : (
                                    <div className={styles.avatarPlaceholder}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{user.name}</span>
                                    <button
                                        className={styles.signOutButton}
                                        onClick={handleSignOut}
                                    >
                                        {strings.auth.signOut}
                                    </button>
                                </div>
                            </div>
                            <button
                                className={styles.settingsButton}
                                onClick={onSettingsClick}
                                aria-label={strings.settings.title}
                            >
                                <SettingsIcon size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
