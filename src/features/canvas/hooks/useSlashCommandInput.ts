/**
 * useSlashCommandInput Hook
 * Manages slash command detection, prefix-lock, and input mode state
 * Used by IdeaCard to handle "/" commands for AI generation
 */
import { useState, useCallback } from 'react';
import type { InputMode, SlashCommand, SlashCommandId } from '../types/slashCommand';
import { getCommandById, getCommandByPrefix } from '../services/slashCommands';

interface UseSlashCommandInputReturn {
    /** Current input mode: 'note' for regular text, 'ai' for AI prompts */
    inputMode: InputMode;
    /** Whether the slash command menu is open */
    isMenuOpen: boolean;
    /** Query text after "/" for filtering commands */
    query: string;
    /** Current input value (user text, excluding prefix) */
    inputValue: string;
    /** Currently active command (prefix-locked), or null */
    activeCommand: SlashCommand | null;
    /** Handle input value changes, detect "/" and "/prefix:" patterns */
    handleInputChange: (value: string) => void;
    /** Handle command selection from menu */
    handleCommandSelect: (id: SlashCommandId) => void;
    /** Deactivate current command (e.g. backspace past prefix) */
    handleDeactivateCommand: () => void;
    /** Close the menu without selecting a command */
    closeMenu: () => void;
    /** Reset all state to initial values */
    reset: () => void;
}

/** Regex to detect "/prefix:" pattern at start of input */
const PREFIX_PATTERN = /^\/([a-zA-Z]+):(.*)/;

/**
 * Map command IDs to input modes
 * Extend when adding new command types
 */
const COMMAND_MODE_MAP: Record<SlashCommandId, InputMode> = {
    'ai-generate': 'ai',
};

/**
 * Hook for managing slash command input behavior
 * Detects "/" at input start, "/prefix:" for auto-activation,
 * and manages prefix-lock mode for active commands
 */
export function useSlashCommandInput(): UseSlashCommandInputReturn {
    const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [inputValue, setInputValue] = useState('');

    /** Derived input mode from active command */
    const inputMode: InputMode = activeCommand
        ? COMMAND_MODE_MAP[activeCommand.id]
        : 'note';

    const handleInputChange = useCallback((value: string) => {
        // In prefix-lock mode, just update input value
        if (activeCommand) {
            setInputValue(value);
            return;
        }

        // Check for "/prefix:" auto-activation pattern
        const prefixMatch = PREFIX_PATTERN.exec(value);
        if (prefixMatch) {
            const prefix = prefixMatch[1] ?? '';
            const rest = prefixMatch[2] ?? '';
            const cmd = getCommandByPrefix(prefix);
            if (cmd) {
                setActiveCommand(cmd);
                setIsMenuOpen(false);
                setQuery('');
                setInputValue(rest);
                return;
            }
        }

        // Standard slash detection in note mode
        setInputValue(value);
        if (value.startsWith('/')) {
            setIsMenuOpen(true);
            setQuery(value.slice(1));
        } else {
            setIsMenuOpen(false);
            setQuery('');
        }
    }, [activeCommand]);

    const handleCommandSelect = useCallback((id: SlashCommandId) => {
        const cmd = getCommandById(id);
        if (cmd) {
            setActiveCommand(cmd);
        }
        setIsMenuOpen(false);
        setQuery('');
        setInputValue('');
    }, []);

    const handleDeactivateCommand = useCallback(() => {
        setActiveCommand(null);
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
        setActiveCommand(null);
        setIsMenuOpen(false);
        setQuery('');
        setInputValue('');
    }, []);

    return {
        inputMode,
        isMenuOpen,
        query,
        inputValue,
        activeCommand,
        handleInputChange,
        handleCommandSelect,
        handleDeactivateCommand,
        closeMenu,
        reset,
    };
}
