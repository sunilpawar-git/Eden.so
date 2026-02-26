/**
 * Tags Feature - Export public API
 */
export { TagInput } from './components/TagInput';
export { useTagStore } from './stores/tagStore';
export { createTag, getTagColors } from './types/tag';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- re-exported for backward compatibility
export { DEFAULT_TAG_COLORS } from './types/tag';
export type { Tag } from './types/tag';
