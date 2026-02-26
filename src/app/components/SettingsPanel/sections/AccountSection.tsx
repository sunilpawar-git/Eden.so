/**
 * Account Section - User account info
 */
import { strings } from '@/shared/localization/strings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut } from '@/features/auth/services/authService';
import styles from '../SettingsPanel.module.css';

export function AccountSection() {
    const user = useAuthStore((state) => state.user);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    };

    if (!user) return null;

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.account}</h3>
            <div className={styles.accountInfo}>
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className={styles.accountAvatar}
                    />
                ) : (
                    <div className={styles.accountAvatarPlaceholder}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className={styles.accountDetails}>
                    <span className={styles.accountName}>{user.name}</span>
                    <span className={styles.accountEmail}>{user.email}</span>
                </div>
            </div>
            <button className={styles.signOutButton} onClick={handleSignOut}>
                {strings.auth.signOut}
            </button>
        </div>
    );
}
