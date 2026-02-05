/**
 * Slash Commands Service
 * SSOT for available slash commands and filtering logic
 */
import type { SlashCommand } from '../types/slashCommand';

/**
 * Registry of all available slash commands
 * Add new commands here - they will automatically appear in the menu
 */
export const slashCommands: SlashCommand[] = [
    {
        id: 'ai-generate',
        labelKey: 'slashCommands.aiGenerate.label',
        descriptionKey: 'slashCommands.aiGenerate.description',
        icon: '✨',
        keywords: ['ai', 'generate', 'create', 'write'],
    },
];

/**
 * Filter commands by search query
 * Matches against keyword prefixes (case-insensitive)
 * @param query - Search query (text after "/")
 * @returns Filtered list of matching commands
 */
export function filterCommands(query: string): SlashCommand[] {
    if (!query) {
        return slashCommands;
    }
    
    const q = query.toLowerCase();
    return slashCommands.filter(cmd =>
        cmd.keywords.some(keyword => keyword.startsWith(q))
    );
}

/**
 * Get a command by its ID
 * @param id - Command ID to find
 * @returns Command if found, undefined otherwise
 */
export function getCommandById(id: string): SlashCommand | undefined {
    return slashCommands.find(cmd => cmd.id === id);
}
