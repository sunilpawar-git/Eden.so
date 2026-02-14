/**
 * KnowledgeBankAddButton — Toolbar button with dropdown menu
 * Positioned left of SearchBar in top toolbar
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { PasteTextModal } from './PasteTextModal';
import { addKBEntry } from '../services/knowledgeBankService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import {
    KB_MAX_ENTRIES,
    KB_ACCEPTED_TEXT_TYPES,
    KB_ACCEPTED_IMAGE_TYPES,
} from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from './KnowledgeBankAddButton.module.css';

const ACCEPTED_EXTENSIONS = [...KB_ACCEPTED_TEXT_TYPES, ...KB_ACCEPTED_IMAGE_TYPES].join(',');

export function KnowledgeBankAddButton() {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const entryCount = useKnowledgeBankStore((s) => s.entries.length);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const { processFile, isProcessing } = useFileProcessor();

    const isMaxReached = entryCount >= KB_MAX_ENTRIES;
    const kb = strings.knowledgeBank;

    // Close dropdown on outside click
    useEffect(() => {
        if (!isDropdownOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isDropdownOpen]);

    const handleUploadClick = useCallback(() => {
        setDropdownOpen(false);
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) await processFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        [processFile]
    );

    const handlePasteClick = useCallback(() => {
        setDropdownOpen(false);
        setModalOpen(true);
    }, []);

    const handlePasteSave = useCallback(
        async (title: string, content: string) => {
            const userId = useAuthStore.getState().user?.id;
            const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
            if (!userId || !workspaceId) return;

            try {
                const count = useKnowledgeBankStore.getState().entries.length;
                const entry = await addKBEntry(userId, workspaceId, {
                    type: 'text',
                    title,
                    content,
                }, undefined, count);
                useKnowledgeBankStore.getState().addEntry(entry);
                setModalOpen(false);
                toast.success(kb.saveEntry);
            } catch (error) {
                const msg = error instanceof Error ? error.message : kb.errors.saveFailed;
                toast.error(msg);
            }
        },
        [kb.errors.saveFailed, kb.saveEntry]
    );

    const handleViewClick = useCallback(() => {
        setDropdownOpen(false);
        setPanelOpen(true);
    }, [setPanelOpen]);

    return (
        <>
            <div className={styles.container} ref={containerRef}>
                <button
                    className={styles.addButton}
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    title={kb.addButton}
                    disabled={isProcessing}
                >
                    <span className={styles.icon}>📎</span>
                    {entryCount > 0 && <span className={styles.badge}>{entryCount}</span>}
                </button>
                {isDropdownOpen && (
                    <div className={styles.dropdown}>
                        {isMaxReached ? (
                            <MaxReachedMessage />
                        ) : (
                            <DropdownActions
                                onUpload={handleUploadClick}
                                onPaste={handlePasteClick}
                            />
                        )}
                        <div className={styles.divider} />
                        <button className={styles.dropdownItem} onClick={handleViewClick}>
                            <span className={styles.dropdownIcon}>📚</span>
                            {kb.viewBank} ({entryCount})
                        </button>
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className={styles.hiddenInput}
            />
            <PasteTextModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handlePasteSave}
            />
        </>
    );
}

/** Sub-component: max entries warning */
function MaxReachedMessage() {
    const kb = strings.knowledgeBank;
    return (
        <div className={styles.maxReached}>
            <span className={styles.dropdownIcon}>⚠️</span>
            <div>
                <div className={styles.dropdownLabel}>{kb.maxEntriesReached}</div>
                <div className={styles.dropdownHint}>{kb.maxEntriesDescription}</div>
            </div>
        </div>
    );
}

/** Sub-component: upload + paste actions */
function DropdownActions({ onUpload, onPaste }: { onUpload: () => void; onPaste: () => void }) {
    const kb = strings.knowledgeBank;
    return (
        <>
            <button className={styles.dropdownItem} onClick={onUpload}>
                <span className={styles.dropdownIcon}>📄</span> {kb.uploadFile}
            </button>
            <button className={styles.dropdownItem} onClick={onPaste}>
                <span className={styles.dropdownIcon}>📝</span> {kb.pasteText}
            </button>
        </>
    );
}
