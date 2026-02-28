/**
 * SegmentedControl — Accessible horizontal radio pill group.
 * Each option uses a visually hidden radio input for native semantics.
 */
import React from 'react';
import styles from './SegmentedControl.module.css';
import type { ReactNode } from 'react';

interface SegmentOption<T extends string> {
    value: T;
    label: string;
    preview?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
    name: string;
    label: string;
    options: ReadonlyArray<SegmentOption<T>>;
    value: T;
    onChange: (value: T) => void;
}

function SegmentedControlInner<T extends string>({
    name,
    label,
    options,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    return (
        <div className={styles.container} role="radiogroup" aria-label={label}>
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <label
                        key={option.value}
                        className={`${styles.segment} ${isActive ? styles.segmentActive : ''}`}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={isActive}
                            onChange={() => onChange(option.value)}
                            className={styles.hiddenRadio}
                        />
                        {option.preview != null && <span className={styles.preview}>{option.preview}</span>}
                        <span className={styles.segmentLabel}>{option.label}</span>
                    </label>
                );
            })}
        </div>
    );
}

export const SegmentedControl = React.memo(SegmentedControlInner) as typeof SegmentedControlInner;
