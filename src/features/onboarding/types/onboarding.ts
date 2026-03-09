/**
 * Onboarding types — state machine, actions, and coach mark config.
 * Pure types: no React, no side effects.
 */

export const ONBOARDING_STEPS = ['createNode', 'connectNodes', 'synthesize'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Stable IDs for the two demo nodes seeded on first run */
export const DEMO_NODE_1_ID = 'onboarding-node-1';
export const DEMO_NODE_2_ID = 'onboarding-node-2';

export const STORAGE_KEY         = 'onboarding_completed';
export const WELCOME_STORAGE_KEY = 'welcome_shown'; // write-once, never cleared on replay

export interface CoachMarkConfig {
    readonly step:           OnboardingStep;
    readonly targetSelector: string;
    readonly placement:      OnboardingPlacement;
    readonly tryPrompt?:     string;
}

export interface OnboardingState {
    readonly showWelcome: boolean;       // true → render WelcomeScreen (gates coach marks)
    readonly stepIndex:   number | null; // null → no active coach mark
    readonly isCompleted: boolean;
}

export type OnboardingAction =
    | { readonly type: 'START' }           // fires when workspace loads
    | { readonly type: 'DISMISS_WELCOME' } // "Let's go →" clicked
    | { readonly type: 'NEXT' }
    | { readonly type: 'SKIP' }
    | { readonly type: 'REPLAY' };         // skips welcome, starts from step 1
