/**
 * useSlashCommandInput Hook
 * Manages slash command detection and input mode state
 * Used by IdeaCard to handle "/" commands for AI generation
 */
import { useState, useCallback } from 'react';
import type { InputMode, SlashCommandId } from '../types/slashCommand';

interface UseSlashCommandInputReturn {
    /** Current input mode: 'note' for regular text, 'ai' for AI prompts */
    inputMode: InputMode;
    /** Whether the slash command menu is open */
    isMenuOpen: boolean;
    /** Query text after "/" for filtering commands */
    query: string;
    /** Current input value */
    inputValue: string;
    /** Handle input value changes, detect "/" at start */
    handleInputChange: (value: string) => void;
    /** Handle command selection from menu */
    handleCommandSelect: (id: SlashCommandId) => void;
    /** Close the menu without selecting a command */
    closeMenu: () => void;
    /** Reset all state to initial values */
    reset: () => void;
}

/**
 * Hook for managing slash command input behavior
 * Detects "/" at input start and manages AI/note modes
 */
export function useSlashCommandInput(): UseSlashCommandInputReturn {
    const [inputMode, setInputMode] = useState<InputMode>('note');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = useCallback((value: string) => {
        setInputValue(value);

        // Only detect "/" in note mode at start of input
        if (inputMode === 'note' && value.startsWith('/')) {
            setIsMenuOpen(true);
            setQuery(value.slice(1)); // Text after "/"
        } else if (inputMode === 'note') {
            // Not a slash command, close menu if open
            setIsMenuOpen(false);
            setQuery('');
        }
        // In AI mode, don't detect slash commands
    }, [inputMode]);

    const handleCommandSelect = useCallback((id: SlashCommandId) => {
        // Map command IDs to input modes - all commands switch to 'ai' mode for now
        // When adding new commands, extend this mapping
        const commandModeMap: Record<SlashCommandId, InputMode> = {
            'ai-generate': 'ai',
        };
        
        setInputMode(commandModeMap[id]);
        setIsMenuOpen(false);
        setQuery('');
        setInputValue('');
    }, []);

    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
        setQuery('');
        // Preserve inputValue so user can continue typing
    }, []);

    const reset = useCallback(() => {
        setInputMode('note');
        setIsMenuOpen(false);
        setQuery('');
        setInputValue('');
    }, []);

    return {
        inputMode,
        isMenuOpen,
        query,
        inputValue,
        handleInputChange,
        handleCommandSelect,
        closeMenu,
        reset,
    };
}
