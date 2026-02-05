/**
 * Tag Store Tests
 * TDD: Tests for tag management
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTagStore } from '../stores/tagStore';

describe('tagStore', () => {
    beforeEach(() => {
        useTagStore.setState({ tags: [] });
    });

    it('should start with empty tags', () => {
        const { tags } = useTagStore.getState();
        expect(tags).toHaveLength(0);
    });

    it('should add a new tag', () => {
        const { addTag } = useTagStore.getState();
        addTag('work');

        const { tags } = useTagStore.getState();
        expect(tags).toHaveLength(1);
        expect(tags[0]?.name).toBe('work');
    });

    it('should not add duplicate tags (case insensitive)', () => {
        const { addTag } = useTagStore.getState();
        addTag('Work');
        addTag('work');
        addTag('WORK');

        const { tags } = useTagStore.getState();
        expect(tags).toHaveLength(1);
    });

    it('should remove a tag', () => {
        const { addTag, removeTag } = useTagStore.getState();
        addTag('work');
        
        const { tags: tagsAfterAdd } = useTagStore.getState();
        const tagId = tagsAfterAdd[0]?.id;
        expect(tagId).toBeDefined();
        
        removeTag(tagId!);
        
        const { tags: tagsAfterRemove } = useTagStore.getState();
        expect(tagsAfterRemove).toHaveLength(0);
    });

    it('should get tag by id', () => {
        const { addTag, getTagById } = useTagStore.getState();
        addTag('project');

        const { tags } = useTagStore.getState();
        const tagId = tags[0]?.id;
        const tag = getTagById(tagId!);

        expect(tag?.name).toBe('project');
    });

    it('should get tag by name', () => {
        const { addTag } = useTagStore.getState();
        addTag('Ideas');

        const tag = useTagStore.getState().getTagByName('ideas');
        expect(tag?.name).toBe('ideas');
    });

    it('should return undefined for non-existent tag', () => {
        const { getTagById, getTagByName } = useTagStore.getState();
        
        expect(getTagById('non-existent')).toBeUndefined();
        expect(getTagByName('non-existent')).toBeUndefined();
    });
});
