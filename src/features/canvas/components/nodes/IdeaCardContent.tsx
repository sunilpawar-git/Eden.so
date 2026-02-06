/**
 * IdeaCardContent - Extracted content area sub-components
 * Reduces IdeaCard.tsx complexity by separating view state rendering
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommandId } from '../../types/slashCommand';
import styles from './IdeaCard.module.css';

interface EditingContentProps {
    inputMode: 'note' | 'ai';
    inputValue: string;
    placeholder: string;
    isMenuOpen: boolean;
    isGenerating: boolean;
    query: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    textareaRect: DOMRect | null;
    onInputChange: (value: string) => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onCommandSelect: (id: SlashCommandId) => void;
    onMenuClose: () => void;
}

export const EditingContent = React.memo(({
    inputMode,
    inputValue,
    placeholder,
    isMenuOpen,
    isGenerating,
    query,
    textareaRef,
    textareaRect,
    onInputChange,
    onBlur,
    onKeyDown,
    onCommandSelect,
    onMenuClose,
}: EditingContentProps) => (
    <div className={styles.inputWrapper}>
        {inputMode === 'ai' && (
            <div className={styles.aiIndicator} data-testid="ai-mode-indicator">
                ✨ {strings.ideaCard.aiModeIndicator}
            </div>
        )}
        <textarea
            ref={textareaRef}
            className={styles.inputArea}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus
            disabled={isGenerating}
        />
        {isMenuOpen && textareaRect && (
            <SlashCommandMenu
                query={query}
                onSelect={onCommandSelect}
                onClose={onMenuClose}
                anchorRect={textareaRect}
            />
        )}
    </div>
));

export const GeneratingContent = React.memo(() => (
    <div className={styles.generating}>
        <div className={styles.spinner} />
        <span>{strings.canvas.generating}</span>
    </div>
));

interface AICardContentProps {
    prompt: string;
    output: string;
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const AICardContent = React.memo(({
    prompt,
    output,
    onDoubleClick,
    onKeyDown,
}: AICardContentProps) => (
    <>
        <div
            className={styles.promptText}
            onDoubleClick={onDoubleClick}
            role="button"
            tabIndex={0}
            onKeyDown={onKeyDown}
        >
            {prompt}
        </div>
        <div
            className={styles.divider}
            data-testid="ai-divider"
            aria-label={strings.ideaCard.aiDividerLabel}
        />
        <MarkdownRenderer content={output} className={styles.outputContent} />
    </>
));

interface SimpleCardContentProps {
    output: string;
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const SimpleCardContent = React.memo(({
    output,
    onDoubleClick,
    onKeyDown,
}: SimpleCardContentProps) => (
    <div
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
    >
        <MarkdownRenderer content={output} className={styles.outputContent} />
    </div>
));

interface PlaceholderContentProps {
    onDoubleClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const PlaceholderContent = React.memo(({
    onDoubleClick,
    onKeyDown,
}: PlaceholderContentProps) => (
    <div
        className={styles.placeholder}
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
    >
        {strings.ideaCard.inputPlaceholder}
    </div>
));
