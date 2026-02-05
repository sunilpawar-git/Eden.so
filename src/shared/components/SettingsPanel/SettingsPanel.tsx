/**
 * Settings Panel - Modal with tabbed settings sections
 */
import { useState, useEffect, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { AppearanceSection } from './sections/AppearanceSection';
import { CanvasSection } from './sections/CanvasSection';
import { AccountSection } from './sections/AccountSection';
import { KeyboardSection } from './sections/KeyboardSection';
import styles from './SettingsPanel.module.css';

type TabId = 'appearance' | 'canvas' | 'account' | 'keyboard';

interface Tab {
    id: TabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'appearance', label: strings.settings.appearance },
    { id: 'canvas', label: strings.settings.canvas },
    { id: 'account', label: strings.settings.account },
    { id: 'keyboard', label: strings.settings.keyboard },
];

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const [activeTab, setActiveTab] = useState<TabId>('appearance');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const renderSection = () => {
        switch (activeTab) {
            case 'appearance':
                return <AppearanceSection />;
            case 'canvas':
                return <CanvasSection />;
            case 'account':
                return <AccountSection />;
            case 'keyboard':
                return <KeyboardSection />;
        }
    };

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div 
                className={styles.backdrop} 
                onClick={onClose}
                data-testid="settings-backdrop"
            />
            <div className={styles.panel}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{strings.settings.title}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={strings.settings.close}
                    >
                        ×
                    </button>
                </div>
                <div className={styles.content}>
                    <nav className={styles.tabs}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.sectionContent}>
                        {renderSection()}
                    </div>
                </div>
            </div>
        </div>
    );
}
