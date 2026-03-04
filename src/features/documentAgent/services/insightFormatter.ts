/**
 * Insight Formatter — formats ExtractionResult into structured markdown.
 * Pure function, no side effects. All section headers from strings.
 */
import { strings } from '@/shared/localization/strings';
import type { ExtractionResult, ConfidenceLevel } from '../types/documentAgent';

const CONFIDENCE_FOOTER: Record<ConfidenceLevel, string> = {
    high: strings.documentAgent.confidenceFooterHigh,
    medium: strings.documentAgent.confidenceFooterMedium,
    low: strings.documentAgent.confidenceFooterLow,
};

function formatBulletList(items: string[]): string {
    return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Format extraction result into structured markdown for the insight node.
 * Omits empty sections. Includes confidence footer.
 */
export function formatInsightMarkdown(result: ExtractionResult, filename: string): string {
    const sections: string[] = [];

    sections.push(`**${strings.documentAgent.summarySection}** _(${filename})_\n\n${result.summary}`);

    if (result.keyFacts.length > 0) {
        sections.push(`**${strings.documentAgent.keyFactsSection}**\n\n${formatBulletList(result.keyFacts)}`);
    }

    if (result.actionItems.length > 0) {
        sections.push(`**${strings.documentAgent.actionItemsSection}**\n\n${formatBulletList(result.actionItems)}`);
    }

    if (result.questions.length > 0) {
        sections.push(`**${strings.documentAgent.questionsSection}**\n\n${formatBulletList(result.questions)}`);
    }

    if (result.extendedFacts.length > 0) {
        sections.push(`**${strings.documentAgent.extendedFactsSection}**\n\n${formatBulletList(result.extendedFacts)}`);
    }

    sections.push(`---\n_${CONFIDENCE_FOOTER[result.confidence]}_`);

    return sections.join('\n\n');
}
