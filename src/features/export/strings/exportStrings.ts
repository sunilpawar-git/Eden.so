export const exportStrings = {
    labels: {
        exportBranch: 'Export branch',
        exportSelection: 'Export selection',
        copyBranch: 'Copy as markdown',
        copyToClipboard: 'Copy to clipboard',
        download: 'Download',
        polish: 'Polish with AI',
        polishing: 'Polishing...',
        preview: 'Preview',
        copied: 'Copied to clipboard',
        downloadComplete: 'Download complete',
        noContent: 'No content to export',
        exportError: 'Export failed',
        filenamePrefix: 'actionstation-export',
    },
    sections: {
        attachments: 'Attachments',
        tags: 'Tags',
        synthesizedFrom: 'Synthesized from',
        ideas: 'ideas',
        generatedBy: 'Generated from canvas by ActionStation',
        seeAbove: '(see above)',
    },
    prompts: {
        polishInstruction:
            'Improve the flow and transitions between sections of this document. Fix any grammatical issues. Do NOT add, remove, or change the meaning of any content. Preserve all headings, facts, and structure. Return the improved document in markdown format.',
    },
} as const;
