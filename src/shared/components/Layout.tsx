/**
 * Main Layout - Sidebar + Canvas Area
 */
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

interface LayoutProps {
    children: ReactNode;
    onSettingsClick?: () => void;
}

export function Layout({ children, onSettingsClick }: LayoutProps) {
    return (
        <div className={styles.layout}>
            <Sidebar onSettingsClick={onSettingsClick} />
            <main className={styles.main}>{children}</main>
        </div>
    );
}
