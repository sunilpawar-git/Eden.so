const REVOKE_DELAY_MS = 200;

/**
 * Downloads content as a file via temporary blob URL.
 * Revokes the URL after a delay to allow the browser to initiate the download.
 */
export function downloadAsFile(
    content: string,
    filename: string,
    mimeType: string
): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
