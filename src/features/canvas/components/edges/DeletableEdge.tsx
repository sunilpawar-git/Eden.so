/**
 * DeletableEdge - Custom edge with midpoint delete button
 * Renders bezier path with hover-activated delete control
 */
import React, { useState, useCallback } from 'react';
import {
    getBezierPath,
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
} from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useSettingsStore, type ConnectorStyle } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import styles from './DeletableEdge.module.css';

/**
 * Returns dynamic SVG style properties based on the chosen ConnectorStyle.
 */
function getEdgeStyle(styleOption: ConnectorStyle, baseStyle: React.CSSProperties = {}): React.CSSProperties {
    const computedStyle = { ...baseStyle };
    switch (styleOption) {
        case 'subtle':
            computedStyle.opacity = 0.5;
            computedStyle.strokeWidth = 1;
            break;
        case 'thick':
            computedStyle.strokeWidth = 4;
            break;
        case 'dashed':
            computedStyle.strokeDasharray = '6,6';
            break;
        case 'dotted':
            computedStyle.strokeDasharray = '2,6';
            computedStyle.strokeLinecap = 'round';
            break;
        case 'solid':
        default:
            // Base styles are usually defined in CSS, so solid requires no overrides
            break;
    }
    return computedStyle;
}

export const DeletableEdge = React.memo(function DeletableEdge({
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    markerEnd,
    style,
}: EdgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const deleteEdge = useCanvasStore((s) => s.deleteEdge);
    const connectorStyle = useSettingsStore((s) => s.connectorStyle);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const handleDelete = useCallback(() => {
        deleteEdge(id);
    }, [deleteEdge, id]);

    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const dynamicStyle = getEdgeStyle(connectorStyle, style);

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={dynamicStyle} />
            {/* Wider invisible path for hover detection */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={20}
                stroke="transparent"
                className="react-flow__edge-interaction"
                data-testid="edge-interaction"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
            <EdgeLabelRenderer>
                <div
                    className={`${styles.deleteButtonWrapper} ${isHovered ? styles.visible : ''} nodrag nopan`}
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        className={styles.deleteButton}
                        onClick={handleDelete}
                        aria-label={strings.edge.deleteConnection}
                        type="button"
                    >
                        {'\u00D7'}
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
});
