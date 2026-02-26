import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut } from '@/features/auth/services/authService';
import { strings } from '@/shared/localization/strings';
import { SettingsIcon } from '@/shared/components/icons';
import styles from '@/shared/components/Sidebar.module.css';

interface SidebarFooterProps {
    onSettingsClick?: () => void;
}

export function SidebarFooter({ onSettingsClick }: SidebarFooterProps) {
    const { user } = useAuthStore();

    if (!user) return null;

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    };

    return (
        <div className={styles.footer}>
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
        </div>
    );
}
