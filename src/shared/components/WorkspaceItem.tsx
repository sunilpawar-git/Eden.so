/**
 * WorkspaceItem Component - Single workspace entry in sidebar list
 * Extracted from Sidebar.tsx for SRP and file size constraints.
 */
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PinWorkspaceButton } from '@/features/workspace/components/PinWorkspaceButton';
import { DragHandleIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import styles from './Sidebar.module.css';

interface WorkspaceItemProps {
    id: string;
    name: string;
    isActive: boolean;
    onSelect: (id: string) => void;
    onRename: (id: string, newName: string) => void;
}

export function WorkspaceItem({ id, name, isActive, onSelect, onRename }: WorkspaceItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 100 : 1,
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditName(name);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editName.trim() && editName !== name) {
            onRename(id, editName.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(name);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.workspaceItem} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
            onClick={() => !isEditing && onSelect(id)}
        >
            {isEditing ? (
                <input
                    type="text"
                    className={styles.workspaceNameInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <>
                    <button
                        className={styles.dragHandle}
                        type="button"
                        aria-label={strings.workspace.dragHandle}
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DragHandleIcon width="16" height="16" />
                    </button>
                    <span
                        className={styles.workspaceName}
                        onDoubleClick={handleDoubleClick}
                    >
                        {name}
                    </span>
                    <PinWorkspaceButton workspaceId={id} />
                </>
            )}
        </div>
    );
}
