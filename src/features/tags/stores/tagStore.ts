/**
 * Tag Store - Zustand store for tag management
 * BASB: Organize and categorize captured ideas
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Tag } from '../types/tag';
import { createTag } from '../types/tag';

interface TagState {
    tags: Tag[];
}

interface TagActions {
    addTag: (name: string, color?: string) => Tag | undefined;
    removeTag: (tagId: string) => void;
    getTagById: (tagId: string) => Tag | undefined;
    getTagByName: (name: string) => Tag | undefined;
}

type TagStore = TagState & TagActions;

export const useTagStore = create<TagStore>()(
    persist(
        (set, get) => ({
            tags: [],

            addTag: (name: string, color?: string) => {
                const normalizedName = name.trim().toLowerCase();
                if (!normalizedName) return undefined;

                // Check for duplicates
                const existing = get().tags.find(
                    (t) => t.name === normalizedName
                );
                if (existing) return existing;

                const newTag = createTag(name, color);
                set((state) => ({
                    tags: [...state.tags, newTag],
                }));
                return newTag;
            },

            removeTag: (tagId: string) => {
                set((state) => ({
                    tags: state.tags.filter((t) => t.id !== tagId),
                }));
            },

            getTagById: (tagId: string) => {
                return get().tags.find((t) => t.id === tagId);
            },

            getTagByName: (name: string) => {
                const normalizedName = name.trim().toLowerCase();
                return get().tags.find((t) => t.name === normalizedName);
            },
        }),
        {
            name: 'actionstation-tags',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
