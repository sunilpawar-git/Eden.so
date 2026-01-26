/**
 * Sidebar Component - Workspace list and navigation
 */
import { strings } from '@/shared/localization/strings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut } from '@/features/auth/services/authService';
import styles from './Sidebar.module.css';

export function Sidebar() {
    const { user } = useAuthStore();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.logo}>
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                        <path
                            d="M16 24L22 30L32 18"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <span className={styles.appName}>{strings.app.name}</span>
            </div>

            <div className={styles.workspaces}>
                <button className={styles.newWorkspace}>
                    <span className={styles.plusIcon}>+</span>
                    <span>{strings.workspace.newWorkspace}</span>
                </button>

                {/* Workspace list will be populated here */}
                <div className={styles.workspaceList}>
                    <div className={styles.workspaceItem}>
                        <span className={styles.workspaceName}>
                            {strings.workspace.untitled}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                {user && (
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
                )}
            </div>
        </aside>
    );
}
