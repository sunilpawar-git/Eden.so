/**
 * Account Section - User info, data export, sign out, and account deletion
 */
import { useCallback, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut, deleteAccount } from '@/features/auth/services/authService';
import { useConfirm } from '@/shared/stores/confirmStore';
import { useDataExport } from '@/features/workspace/hooks/useDataExport';
import { toast } from '@/shared/stores/toastStore';
import panelStyles from '../SettingsPanel.module.css';
import styles from './AccountSection.module.css';

export function AccountSection() {
    const user = useAuthStore((s) => s.user);
    const confirm = useConfirm();
    const { exportData } = useDataExport();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    }, []);

    const handleExport = useCallback(() => {
        try {
            exportData();
            toast.success(strings.settings.exportSuccess);
        } catch {
            toast.error(strings.errors.generic);
        }
    }, [exportData]);

    const handleDeleteAccount = useCallback(async () => {
        const confirmed = await confirm({
            title: strings.settings.deleteAccountTitle,
            message: strings.settings.deleteAccountConfirm,
            confirmText: strings.settings.deleteAccountButton,
            isDestructive: true,
        });

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await deleteAccount();
            toast.success(strings.settings.deleteAccountSuccess);
        } catch {
            toast.error(strings.settings.deleteAccountFailed);
        } finally {
            setIsDeleting(false);
        }
    }, [confirm]);

    if (!user) return null;

    return (
        <div className={panelStyles.section}>
            <h3 className={panelStyles.sectionTitle}>{strings.settings.account}</h3>
            <div className={styles.accountInfo}>
                {user.avatarUrl.length > 0 ? (
                    <img src={user.avatarUrl} alt={user.name} className={styles.accountAvatar} />
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

            <button className={styles.actionButton} onClick={handleSignOut}>
                {strings.auth.signOut}
            </button>

            <h3 className={panelStyles.sectionTitle}>{strings.settings.exportData}</h3>
            <span className={panelStyles.settingDescription}>{strings.settings.exportDataDescription}</span>
            <button className={styles.actionButton} onClick={handleExport}>
                {strings.settings.exportData}
            </button>

            <h3 className={`${panelStyles.sectionTitle} ${styles.dangerTitle}`}>{strings.settings.dangerZone}</h3>
            <button
                className={styles.dangerButton}
                onClick={handleDeleteAccount}
                disabled={isDeleting}
            >
                {strings.settings.deleteAccount}
            </button>
        </div>
    );
}
