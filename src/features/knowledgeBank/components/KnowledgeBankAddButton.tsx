/**
 * KnowledgeBankAddButton — Toolbar button with dropdown menu
 * Positioned left of SearchBar in top toolbar
 */
import { useState, useCallback, useRef } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { usePasteTextHandler } from '../hooks/usePasteTextHandler';
import { PasteTextModal } from './PasteTextModal';
import { KB_MAX_DOCUMENTS } from '../types/knowledgeBank';
import { kbParserRegistry } from '../parsers/parserRegistry';
import { strings } from '@/shared/localization/strings';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import {
    PaperclipIcon, AlertTriangleIcon, FileTextIcon,
    EditIcon, BookOpenIcon,
} from '@/shared/components/icons';
import styles from './KnowledgeBankAddButton.module.css';

const ACCEPTED_EXTENSIONS = kbParserRegistry.getSupportedExtensions().join(',');

export function KnowledgeBankAddButton() {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const documentCount = useKnowledgeBankStore((s) =>
        s.entries.filter((e) => !e.parentEntryId).length
    );
    const { processFile, isProcessing } = useFileProcessor();
    const handlePasteSave = usePasteTextHandler(useCallback(() => setModalOpen(false), []));
    const handleModalClose = useCallback(() => setModalOpen(false), []);

    const isMaxReached = documentCount >= KB_MAX_DOCUMENTS;
    const kb = strings.knowledgeBank;

    const handleOutsideClick = useCallback(() => setDropdownOpen(false), []);
    useOutsideClick(containerRef, isDropdownOpen, handleOutsideClick);

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

    const handleViewClick = useCallback(() => {
        setDropdownOpen(false);
        useKnowledgeBankStore.getState().setPanelOpen(true);
    }, []);

    return (
        <>
            <div className={styles.container} ref={containerRef}>
                <button
                    className={styles.addButton}
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    title={kb.addButton}
                    disabled={isProcessing}
                >
                    <span className={styles.icon}>
                        <PaperclipIcon size={16} />
                    </span>
                    {documentCount > 0 && <span className={styles.badge}>{documentCount}</span>}
                </button>
                {isDropdownOpen && (
                    <DropdownMenu
                        isMaxReached={isMaxReached}
                        documentCount={documentCount}
                        onUpload={handleUploadClick}
                        onPaste={handlePasteClick}
                        onView={handleViewClick}
                    />
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
                onClose={handleModalClose}
                onSave={handlePasteSave}
            />
        </>
    );
}

/** Sub-component: dropdown menu */
function DropdownMenu({ isMaxReached, documentCount, onUpload, onPaste, onView }: {
    isMaxReached: boolean; documentCount: number;
    onUpload: () => void; onPaste: () => void; onView: () => void;
}) {
    const kb = strings.knowledgeBank;
    return (
        <div className={styles.dropdown}>
            {isMaxReached ? (
                <div className={styles.maxReached}>
                    <span className={styles.dropdownIcon}>
                        <AlertTriangleIcon size={14} />
                    </span>
                    <div>
                        <div className={styles.dropdownLabel}>{kb.maxEntriesReached}</div>
                        <div className={styles.dropdownHint}>{kb.maxEntriesDescription}</div>
                    </div>
                </div>
            ) : (
                <>
                    <button className={styles.dropdownItem} onClick={onUpload}>
                        <span className={styles.dropdownIcon}><FileTextIcon size={14} /></span>
                        {kb.uploadFile}
                    </button>
                    <button className={styles.dropdownItem} onClick={onPaste}>
                        <span className={styles.dropdownIcon}><EditIcon size={14} /></span>
                        {kb.pasteText}
                    </button>
                </>
            )}
            <div className={styles.divider} />
            <button className={styles.dropdownItem} onClick={onView}>
                <span className={styles.dropdownIcon}><BookOpenIcon size={14} /></span>
                {kb.viewBank} ({documentCount})
            </button>
        </div>
    );
}
