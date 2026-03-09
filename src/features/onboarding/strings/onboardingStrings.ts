/**
 * Onboarding copy — all visible strings for the onboarding feature.
 * Imported into strings.ts as strings.onboarding.
 */
export const onboardingStrings = {
    welcome: {
        earlyAccess: 'Early access',
        title:       'Welcome to ActionStation',
        intro:       'A few things to know before you start:',
        bullet1:     'Each card title is your AI prompt — type a thought, generate a response',
        bullet2:     'Connect cards to build context chains for richer AI output',
        bullet3:     'Select multiple cards and Synthesize to reason across your whole canvas',
        ctaLabel:    "Let's go →",
    },
    createNode: {
        title:       'Create a thought',
        description: 'Each card title becomes your AI prompt.',
        tryPrompt:   'Try: Click + and type your first thought',
    },
    connectNodes: {
        title:       'Connect your ideas',
        description: 'Connected cards build context chains for richer AI output.',
        tryPrompt:   'Try: Hover a card edge to reveal ●, then drag to another card',
    },
    synthesize: {
        title:       'Synthesize your thinking',
        description: 'AI respects your canvas structure when generating.',
        tryPrompt:   'Try: Both demo cards are selected — click Synthesize',
    },

    /** Demo node headings seeded on first run */
    demoNode1Heading: 'What should I explore first?',
    demoNode2Heading: 'How does this connect?',

    stepLabel:           (i: number, total: number) => `Step ${i} of ${total}`,
    nextLabel:           'Next',
    doneLabel:           'Done',
    skipLabel:           'Skip tour',
    replayWalkthrough:   'Replay walkthrough',
    helpButtonLabel:     'Help and keyboard shortcuts',
    shortcutsPanelTitle: 'Keyboard shortcuts',
} as const;
