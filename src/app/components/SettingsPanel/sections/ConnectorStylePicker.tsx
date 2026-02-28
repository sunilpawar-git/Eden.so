/**
 * ConnectorStylePicker — Vertical radio list for selecting connector styles.
 * Replaces a horizontal SegmentedControl which clips at 5 options.
 * Uses ConnectorPreview SVG + label per row. Fully accessible (radiogroup).
 */
import React from 'react';
import type { ConnectorStyle } from '@/shared/stores/settingsStore';
import { ConnectorPreview } from './ConnectorPreview';
import { strings } from '@/shared/localization/strings';
import styles from './ConnectorStylePicker.module.css';

interface ConnectorStyleOption {
    value: ConnectorStyle;
    label: string;
}

const OPTIONS: ConnectorStyleOption[] = [
    { value: 'solid', label: strings.settings.connectorSolid },
    { value: 'subtle', label: strings.settings.connectorSubtle },
    { value: 'thick', label: strings.settings.connectorThick },
    { value: 'dashed', label: strings.settings.connectorDashed },
    { value: 'dotted', label: strings.settings.connectorDotted },
];

interface ConnectorStylePickerProps {
    value: ConnectorStyle;
    onChange: (value: ConnectorStyle) => void;
}

export const ConnectorStylePicker = React.memo(function ConnectorStylePicker({
    value,
    onChange,
}: ConnectorStylePickerProps) {
    return (
        <div
            className={styles.container}
            role="radiogroup"
            aria-label={strings.settings.connectorStyle}
        >
            {OPTIONS.map((option) => {
                const isActive = option.value === value;
                return (
                    <label
                        key={option.value}
                        className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                    >
                        <input
                            type="radio"
                            name="connectorStyle"
                            value={option.value}
                            checked={isActive}
                            onChange={() => onChange(option.value)}
                            className={styles.hiddenRadio}
                            aria-label={option.label}
                        />
                        <span className={styles.preview}>
                            <ConnectorPreview style={option.value} />
                        </span>
                        <span className={styles.label}>{option.label}</span>
                        {isActive && (
                            <span className={styles.checkmark} aria-hidden="true">✓</span>
                        )}
                    </label>
                );
            })}
        </div>
    );
});
