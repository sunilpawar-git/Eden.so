/**
 * WorkspaceItem Component - Single workspace entry in sidebar list
 * Extracted from Sidebar.tsx for SRP and file size constraints.
 */
import { useState } from 'react';
import { PinWorkspaceButton } from '@/features/workspace/components/PinWorkspaceButton';
import styles from './Sidebar.module.css';

interface WorkspaceItemProps {
    id: string;
    name: string;
    isActive: boolean;
    onSelect: (id: string) => void;
    onRename: (id: string, newName: string) => void;
}

export function WorkspaceItem({ id, name, isActive, onSelect, onRename }: WorkspaceItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

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
            className={`${styles.workspaceItem} ${isActive ? styles.active : ''}`}
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
