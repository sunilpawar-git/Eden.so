# Phase 7: Onboarding & First-Run Experience — Zero Learning Curve

## Problem Statement

A new user opens ActionStation and sees an empty canvas with a top bar, a sidebar, and no guidance. They don't know that headings are AI prompts, that connecting nodes creates context chains, that selecting multiple nodes enables synthesis, or that right-click opens a context menu. The app has powerful features — but a blank canvas with zero onboarding means users must discover everything by accident. This is the #1 reason people bounce from productivity tools: the first 60 seconds don't show value.

## Intended Solution

A **3-step interactive walkthrough** that fires on first visit only. No modal walls, no video tutorials, no 10-step wizards. Three coach marks that appear sequentially, pointing at real UI elements, guiding the user through the core loop: **Create → Connect → Synthesize**. After the walkthrough, a persistent "?" help button in the corner links to a keyboard shortcuts cheat sheet and a "Replay walkthrough" option.

## Architecture Decisions

- **New feature module**: `src/features/onboarding/` (types, hooks, components)
- **No new Zustand store** — walkthrough step tracked in `localStorage` via a tiny hook
- **Coach marks, not modals** — positioned relative to target elements using `getBoundingClientRect()`, with a semi-transparent backdrop that highlights the target
- **First-run detection**: Check `localStorage` key `onboarding_completed`. If absent, trigger walkthrough after first workspace loads.
- **Non-blocking**: User can dismiss walkthrough at any step (click "Skip" or press Escape). Dismissing sets `onboarding_completed = true`.
- **Replay**: Settings > About tab gets a "Replay walkthrough" button that clears the localStorage flag.
- **No hardcoded strings**: All walkthrough copy in `onboardingStrings.ts`.
- **Accessibility**: Coach marks are `role="dialog"` with `aria-describedby`. Focus trapped within active coach mark.

---

## Sub-phase 7A: Onboarding Types & First-Run Hook

### What We Build

The data model for walkthrough steps and a hook that manages progression.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/onboarding/types/onboarding.ts` | NEW | ~25 |
| `src/features/onboarding/hooks/useOnboarding.ts` | NEW | ~55 |
| `src/features/onboarding/hooks/__tests__/useOnboarding.test.ts` | NEW | ~70 |
| `src/features/onboarding/strings/onboardingStrings.ts` | NEW | ~30 |

### Implementation

**`onboarding.ts`** (~25 lines):

```typescript
export const ONBOARDING_STEPS = ['createNode', 'connectNodes', 'synthesize'] as const;
export type OnboardingStep = typeof ONBOARDING_STEPS[number];

export interface CoachMarkConfig {
  readonly step: OnboardingStep;
  readonly targetSelector: string; // CSS selector for the element to highlight
  readonly title: string;
  readonly description: string;
  readonly placement: 'top' | 'bottom' | 'left' | 'right';
}

export const STORAGE_KEY = 'onboarding_completed';
```

**`useOnboarding.ts`** (~55 lines):

```typescript
export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const isCompleted = localStorage.getItem(STORAGE_KEY) === 'true';

  const start = useCallback(() => {
    if (!isCompleted) setCurrentStep(0);
  }, [isCompleted]);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null) return null;
      if (prev >= ONBOARDING_STEPS.length - 1) {
        localStorage.setItem(STORAGE_KEY, 'true');
        return null; // completed
      }
      return prev + 1;
    });
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(null);
  }, []);

  const replay = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
  }, []);

  const activeStep = currentStep !== null ? ONBOARDING_STEPS[currentStep] : null;

  return { activeStep, stepIndex: currentStep, totalSteps: ONBOARDING_STEPS.length,
           start, next, skip, replay, isCompleted };
}
```

### TDD Tests

```
1. start() sets step to 0 when not completed
2. start() is no-op when already completed
3. next() advances step index
4. next() on last step sets completed flag + resets to null
5. skip() sets completed flag + resets to null
6. replay() clears completed flag + starts from 0
7. activeStep returns correct OnboardingStep for each index
8. isCompleted reads from localStorage
```

### Tech Debt Checkpoint

- [ ] Types under 30 lines
- [ ] Hook under 60 lines
- [ ] All copy in onboardingStrings.ts
- [ ] Zero lint errors

---

## Sub-phase 7B: Coach Mark Component

### What We Build

A reusable `CoachMark` component that highlights a target element and shows instructional text with step indicators.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/onboarding/components/CoachMark.tsx` | NEW | ~75 |
| `src/features/onboarding/components/CoachMark.module.css` | NEW | ~60 |
| `src/features/onboarding/components/__tests__/CoachMark.test.tsx` | NEW | ~80 |

### Implementation

**`CoachMark.tsx`** (~75 lines):

```typescript
interface CoachMarkProps {
  readonly targetSelector: string;
  readonly title: string;
  readonly description: string;
  readonly placement: 'top' | 'bottom' | 'left' | 'right';
  readonly stepLabel: string; // "1 of 3"
  readonly onNext: () => void;
  readonly onSkip: () => void;
  readonly nextLabel: string;
  readonly skipLabel: string;
  readonly isLastStep: boolean;
}

export const CoachMark = React.memo(function CoachMark(props: CoachMarkProps) {
  const [position, setPosition] = useState<DOMRect | null>(null);
  const markRef = useRef<HTMLDivElement>(null);

  // Find target element and position relative to it
  useEffect(() => {
    const target = document.querySelector(props.targetSelector);
    if (target) {
      setPosition(target.getBoundingClientRect());
      // Observe resize/scroll to reposition
    }
  }, [props.targetSelector]);

  if (!position) return null;

  const style = computePlacement(position, props.placement);

  return createPortal(
    <>
      {/* Spotlight backdrop — dims everything except target */}
      <div className={styles.backdrop}>
        <div className={styles.spotlight} style={{
          top: position.top - 4, left: position.left - 4,
          width: position.width + 8, height: position.height + 8,
        }} />
      </div>

      {/* Coach mark tooltip */}
      <div className={styles.coachMark} ref={markRef} style={style}
        role="dialog" aria-label={props.title}>
        <p className={styles.step}>{props.stepLabel}</p>
        <h3 className={styles.title}>{props.title}</h3>
        <p className={styles.description}>{props.description}</p>
        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={props.onSkip}>
            {props.skipLabel}
          </button>
          <button className={styles.nextBtn} onClick={props.onNext}>
            {props.isLastStep ? props.nextLabel : props.nextLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
});
```

**CSS approach:**
- Backdrop uses `clip-path` with an inset polygon to create a "spotlight hole" around the target element — no canvas interaction blocked
- Coach mark tooltip uses CSS variables (`var(--surface-primary)`, `var(--text-primary)`) for theme compatibility
- Arrow indicator via CSS `::after` pseudo-element pointing toward target

### TDD Tests

```
1. Renders title and description from props
2. Shows step label ("1 of 3")
3. Next button calls onNext
4. Skip button calls onSkip
5. Renders in portal (document.body)
6. role="dialog" present
7. Does not render when target element not found
8. Spotlight positioned around target element
9. All text from string resources (no inline strings)
10. Keyboard: Escape calls onSkip
```

### Tech Debt Checkpoint

- [ ] CoachMark under 80 lines
- [ ] CSS uses only variables
- [ ] Portal rendering
- [ ] Accessible (role, aria-label, focus management)
- [ ] Zero lint errors

---

## Sub-phase 7C: Walkthrough Orchestrator & Integration

### What We Build

Wire the walkthrough into the app. After first workspace loads, show 3 sequential coach marks targeting real UI elements.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/onboarding/components/OnboardingWalkthrough.tsx` | NEW | ~65 |
| `src/features/onboarding/components/__tests__/OnboardingWalkthrough.test.tsx` | NEW | ~70 |
| `src/features/onboarding/index.ts` | NEW | ~5 |
| `src/app/App.tsx` (or main canvas wrapper) | EDIT | Mount `<OnboardingWalkthrough />` |
| `src/app/components/SettingsPanel/sections/AboutSection.tsx` | EDIT | Add "Replay walkthrough" button |
| `src/shared/localization/strings.ts` | EDIT | Import onboardingStrings |

### Implementation

**Step definitions** (in `OnboardingWalkthrough.tsx`):

```typescript
const COACH_MARKS: CoachMarkConfig[] = [
  {
    step: 'createNode',
    targetSelector: '[data-testid="add-node-button"]',
    title: onboardingStrings.step1Title,      // "Create a thought"
    description: onboardingStrings.step1Desc,  // "Click here to add a new idea card. Give it a title — that title becomes your AI prompt."
    placement: 'right',
  },
  {
    step: 'connectNodes',
    targetSelector: '[data-testid="connect-button"]',
    title: onboardingStrings.step2Title,      // "Connect your ideas"
    description: onboardingStrings.step2Desc,  // "Drag from one card to another to create a context chain. Connected ideas feed into AI generation."
    placement: 'right',
  },
  {
    step: 'synthesize',
    targetSelector: '[data-testid="selection-toolbar"]',
    title: onboardingStrings.step3Title,      // "Synthesize your thinking"
    description: onboardingStrings.step3Desc,  // "Select multiple connected cards, then click Synthesize to create a summary that respects your canvas structure."
    placement: 'bottom',
  },
];
```

**Trigger**: `useEffect` in `OnboardingWalkthrough` calls `start()` after a 1-second delay (let workspace load first). The delay uses a ref guard to prevent double-firing in StrictMode.

**"Replay walkthrough"**: A single button in Settings > About that calls `replay()`.

### TDD Tests

```
1. Walkthrough renders on first visit (no localStorage flag)
2. Walkthrough does NOT render when completed flag exists
3. Step 1 targets add-node-button
4. Clicking Next advances to step 2
5. Clicking Skip dismisses entirely
6. After step 3 Next, completed flag set in localStorage
7. "Replay walkthrough" in Settings clears flag
8. Walkthrough auto-starts after workspace load delay
9. All strings from onboardingStrings
```

### Tech Debt Checkpoint

- [ ] OnboardingWalkthrough under 70 lines
- [ ] 3 steps only (not a wizard)
- [ ] Non-blocking (Skip always available)
- [ ] localStorage-only (no server state)
- [ ] data-testid attributes added to target elements if missing
- [ ] Zero lint errors

---

## Sub-phase 7D: Help Button & Keyboard Cheat Sheet

### What We Build

A persistent "?" button in the bottom-right corner that opens a keyboard shortcuts panel and a "Replay walkthrough" link. This replaces the Settings > Keyboard tab as the primary shortcut discovery mechanism.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/onboarding/components/HelpButton.tsx` | NEW | ~40 |
| `src/features/onboarding/components/HelpButton.module.css` | NEW | ~25 |
| `src/features/onboarding/components/ShortcutsPanel.tsx` | NEW | ~60 |
| `src/features/onboarding/components/ShortcutsPanel.module.css` | NEW | ~40 |
| `src/features/onboarding/components/__tests__/HelpButton.test.tsx` | NEW | ~40 |

### Implementation

**HelpButton**: Small `?` circle in the bottom-right corner (fixed position, `z-index: var(--z-tooltip)`). Click toggles `ShortcutsPanel`.

**ShortcutsPanel**: A flyout panel listing keyboard shortcuts grouped by category:
- **Navigation**: Pan (Space+Drag), Zoom (Scroll), Search (Ctrl+Shift+K)
- **Nodes**: New (N), Delete (Del), Undo (Ctrl+Z), Redo (Ctrl+Shift+Z)
- **Selection**: Click (select), Shift+Click (multi-select)
- **Canvas**: Lock (L), Arrange (A), Settings (,)

Plus a "Replay walkthrough" link that calls `replay()`.

### TDD Tests

```
1. Help button renders with "?" label
2. Click toggles shortcuts panel
3. Shortcuts panel lists all keyboard shortcuts
4. "Replay walkthrough" link calls replay
5. Panel dismisses on Escape
6. All shortcut labels from string resources
```

### Tech Debt Checkpoint

- [ ] HelpButton under 45 lines
- [ ] ShortcutsPanel under 65 lines
- [ ] CSS uses only variables
- [ ] Accessible (aria-label, keyboard dismiss)
- [ ] Zero lint errors

---

## Phase 7 Summary

### Execution Order

| Phase | What | Why This Order |
|-------|------|----------------|
| 7A | Types + hook + strings | Foundation — no UI yet |
| 7B | CoachMark component | Reusable component, tested in isolation |
| 7C | Walkthrough orchestrator | Composes CoachMark with step configs |
| 7D | Help button + shortcuts | Persistent access after walkthrough |

### Net Impact

- **Files created**: ~16 (components, hooks, types, strings, CSS, tests)
- **Files edited**: 3 (App.tsx, AboutSection, strings.ts)
- **Net line count change**: ~+650 lines
- **User impact**: First 60 seconds go from "blank canvas confusion" to "I know the 3 core moves"
- **Returning users**: "?" button provides ongoing shortcut discovery

### The 3-Step Flow

| Step | Target | Message | User Action |
|------|--------|---------|-------------|
| 1 | Add Node button | "Create a thought — the title becomes your AI prompt" | User clicks to add a node |
| 2 | Connect button | "Connect ideas to build context chains for AI" | User sees how connections work |
| 3 | Selection toolbar | "Select cards + Synthesize = coherent output from your canvas" | User understands the payoff |

### What's NOT Included

| Item | Reason |
|------|--------|
| Video tutorials | Over-engineering for MVP onboarding |
| Feature-specific tooltips | Phase 3 context menu is self-explanatory with labels |
| Achievement/gamification | Not aligned with "thinking tool" identity |
| Interactive sandbox | Real canvas IS the sandbox — no need for a fake one |
| Email onboarding drip | Server-side feature, out of scope for client |
