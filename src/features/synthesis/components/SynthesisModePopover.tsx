/** SynthesisModePopover — four-mode picker for synthesis type */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';
import styles from './SynthesisModePopover.module.css';

interface SynthesisModePopoverProps {
    readonly onSelect: (mode: SynthesisMode) => void;
    readonly onClose: () => void;
}

const MODES: readonly SynthesisMode[] = ['summarize', 'outline', 'narrative', 'questions'];

export const SynthesisModePopover = React.memo(function SynthesisModePopover({
    onSelect,
    onClose,
}: SynthesisModePopoverProps) {
    const [focusIndex, setFocusIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const buttons = listRef.current?.querySelectorAll('button');
        buttons?.[focusIndex]?.focus();
    }, [focusIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusIndex((i) => (i + 1) % MODES.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusIndex((i) => (i - 1 + MODES.length) % MODES.length);
                    break;
                case 'Enter':
                    e.preventDefault();
                    onSelect(MODES[focusIndex]!);
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [focusIndex, onSelect, onClose]
    );

    return (
        <div className={styles.popover} role="listbox" aria-label={synthesisStrings.labels.synthesize} ref={listRef} onKeyDown={handleKeyDown}>
            {MODES.map((mode, idx) => (
                <button
                    key={mode}
                    className={styles.modeButton}
                    role="option"
                    aria-selected={idx === focusIndex}
                    onClick={() => onSelect(mode)}
                    tabIndex={idx === focusIndex ? 0 : -1}
                    type="button"
                >
                    <span className={styles.modeName}>{synthesisStrings.modes[mode]}</span>
                    <span className={styles.modeDesc}>
                        {synthesisStrings.modeDescriptions[mode]}
                    </span>
                </button>
            ))}
        </div>
    );
});
