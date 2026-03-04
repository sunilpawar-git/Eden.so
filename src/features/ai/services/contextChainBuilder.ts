/**
 * Builds a context chain from upstream canvas nodes for AI generation.
 * Async because attachment text may need to be fetched from Storage.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import { attachmentTextCache } from './attachmentTextCache';

/**
 * Fetch cached/remote attachment text for a node. Returns empty string if none.
 */
async function getAttachmentText(node: CanvasNode): Promise<string> {
    const attachments = node.data.attachments;
    if (!attachments || attachments.length === 0) return '';

    const parts = await Promise.all(
        attachments
            .filter((att): att is typeof att & { parsedTextUrl: string } => Boolean(att.parsedTextUrl))
            .map((att) => attachmentTextCache.getText(att.parsedTextUrl))
    );
    return parts.filter(Boolean).join('\n\n');
}

/**
 * Converts upstream nodes (closest-first) into an ordered array of context strings
 * for the AI prompt. Includes attachment text so connected-node AI generation
 * can reference document contents. Nodes without any content are filtered out.
 */
export async function buildContextChain(upstreamNodes: CanvasNode[]): Promise<string[]> {
    const ordered = [...upstreamNodes].reverse();

    const results = await Promise.all(
        ordered.map(async (n) => {
            const d = n.data;
            const heading = d.heading?.trim() ?? '';
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field access for backward compat
            const textContent = d.output ?? d.prompt ?? '';

            const attachmentText = await getAttachmentText(n);

            const parts: string[] = [];
            if (heading) parts.push(heading);
            if (textContent) parts.push(textContent);
            if (attachmentText) parts.push(`[Attached Document]\n${attachmentText}`);

            return parts.join('\n\n');
        })
    );

    return results.filter(Boolean);
}
