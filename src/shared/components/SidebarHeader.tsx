import { strings } from '@/shared/localization/strings';
import { PinIcon } from '@/shared/components/icons';
import styles from './Sidebar.module.css';

interface SidebarHeaderProps {
    isPinned: boolean;
    isHoverOpen: boolean;
    onTogglePin: () => void;
}

export function SidebarHeader({ isPinned, isHoverOpen, onTogglePin }: SidebarHeaderProps) {
    return (
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
            <button
                className={styles.pinToggleButton}
                onClick={onTogglePin}
                aria-label={isPinned ? strings.sidebar.unpin : strings.sidebar.pin}
                aria-pressed={isPinned}
                aria-expanded={isPinned || isHoverOpen}
                title={isPinned ? strings.sidebar.unpinTooltip : strings.sidebar.pinTooltip}
            >
                <PinIcon size={16} filled={isPinned} />
            </button>
        </div>
    );
}
