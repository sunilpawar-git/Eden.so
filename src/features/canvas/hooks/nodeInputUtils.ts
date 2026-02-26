const URL_REGEX = /https?:\/\/[^\s)]+/g;
const MD_IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

export function extractUrls(text: string | null): string[] {
    if (!text) return [];

    const imageUrls = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = MD_IMAGE_REGEX.exec(text)) !== null) {
        if (match[1]) imageUrls.add(match[1]);
    }

    const allUrls = text.match(URL_REGEX);
    if (!allUrls) return [];
    return [...new Set(allUrls)].filter((url) => !imageUrls.has(url));
}
