const URL_REGEX = /https?:\/\/[^\s)]+/g;
const MD_IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

/** Matches `<div data-attachment='...'></div>` blocks whose JSON payload contains URLs that must NOT be detected as link previews */
const ATTACHMENT_BLOCK_REGEX = /<div\s+data-attachment='[^']*'[^>]*><\/div>/g;

export function extractUrls(text: string | null): string[] {
    if (!text) return [];

    // Strip attachment blocks so their internal URLs are not detected as links
    const cleaned = text.replace(ATTACHMENT_BLOCK_REGEX, '');

    const imageUrls = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = MD_IMAGE_REGEX.exec(cleaned)) !== null) {
        if (match[1]) imageUrls.add(match[1]);
    }

    const allUrls = cleaned.match(URL_REGEX);
    if (!allUrls) return [];
    return [...new Set(allUrls)].filter((url) => !imageUrls.has(url));
}
