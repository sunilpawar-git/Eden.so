/**
 * Cross-Reference Formatter — formats cross-reference results into markdown.
 * Pure function, no side effects. All section headers from strings.
 */
import { strings } from '@/shared/localization/strings';
import type { CrossReferenceResult } from '../types/entityIndex';

function formatBulletList(items: string[]): string {
    return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Format cross-reference result into structured markdown for insight node.
 * Omits empty sections.
 */
export function formatCrossRefMarkdown(result: CrossReferenceResult, filename: string): string {
    const sections: string[] = [];

    sections.push(`**${strings.documentAgent.crossRefHeading}** _(${filename})_`);

    if (result.connections.length > 0) {
        sections.push(`**${strings.documentAgent.crossRefConnections}**\n\n${formatBulletList(result.connections)}`);
    }

    if (result.contradictions.length > 0) {
        sections.push(`**${strings.documentAgent.crossRefContradictions}**\n\n${formatBulletList(result.contradictions)}`);
    }

    if (result.actionItems.length > 0) {
        sections.push(`**${strings.documentAgent.crossRefActionItems}**\n\n${formatBulletList(result.actionItems)}`);
    }

    if (result.relatedDocuments.length > 0) {
        sections.push(`**${strings.documentAgent.crossRefRelated}**\n\n${formatBulletList(result.relatedDocuments)}`);
    }

    return sections.join('\n\n');
}
