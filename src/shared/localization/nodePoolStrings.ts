/**
 * Node Pool (Canvas Memory) String Resources
 * Extracted to respect 300-line file limit
 */
export const nodePoolStrings = {
    addToPool: 'Add to AI Memory',
    removeFromPool: 'Remove from AI Memory',
    inPool: 'In AI Memory',
    workspacePoolOn: 'All nodes used as AI context',
    workspacePoolOff: 'Enable all nodes as AI context',
    pooledNodeCount: (n: number) => `${n} node${n !== 1 ? 's' : ''} in AI Memory`,
    poolPreview: (used: number, total: number) => `Using ${used} of ${total} memory nodes`,
    settingsTitle: 'AI Memory',
    settingsDescription: 'Choose which nodes power your AI synthesis',
    clearAll: 'Clear all memory nodes',
    cleared: 'All memory nodes cleared',
    untitled: 'Untitled Node',
    contextHeader: '--- AI Memory ---',
    contextFooter: '--- End AI Memory ---',
    ai: {
        usageGuidance: 'The "AI Memory" section below contains ideas the user previously created on their canvas and explicitly selected as context. Use these as creative inspiration and background knowledge when generating new content. Prioritize relevance to the user\'s current prompt.',
        transformGuidance: 'The "AI Memory" section contains the user\'s own ideas selected as reference context. Consider them when transforming content, but focus primarily on the transformation task.',
    },
} as const;
