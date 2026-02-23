/**
 * PasteTextModal — Modal for adding text entries to Knowledge Bank
 */
import { useState, useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import styles from './PasteTextModal.module.css';

interface PasteTextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, content: string) => void;
}

export function PasteTextModal({ isOpen, onClose, onSave }: PasteTextModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
        // Reset fields when modal closes (M3: prevents stale state on reopen)
        setTitle('');
        setContent('');
    }, [isOpen, handleKeyDown]);

    const handleSave = useCallback(() => {
        if (!title.trim() || !content.trim()) return;
        onSave(title.trim(), content);
        setTitle('');
        setContent('');
    }, [title, content, onSave]);

    if (!isOpen) return null;

    const kb = strings.knowledgeBank;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h4 className={styles.title}>{kb.saveEntry}</h4>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={strings.settings.close}
                    >
                        {strings.common.closeSymbol}
                    </button>
                </div>
                <div className={styles.body}>
                    <input
                        className={styles.titleInput}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={kb.titlePlaceholder}
                        maxLength={100}
                    />
                    <textarea
                        className={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={kb.contentPlaceholder}
                        maxLength={KB_MAX_CONTENT_SIZE}
                    />
                    <div className={styles.charCount}>
                        {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        {strings.common.cancel}
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!title.trim() || !content.trim()}
                    >
                        {kb.saveEntry}
                    </button>
                </div>
            </div>
        </div>
    );
}
