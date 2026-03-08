/** SynthesisFooterWrapper — mounts only for synthesis nodes, zero cost for regular IdeaCards */
import React, { useCallback, useMemo } from 'react';
import { useNodeData } from '@/features/canvas/hooks/useNodeData';
import { captureError } from '@/shared/services/sentryService';
import { useSynthesis } from '../hooks/useSynthesis';
import { SynthesisFooter } from './SynthesisFooter';

interface SynthesisFooterWrapperProps {
    readonly nodeId: string;
}

export const SynthesisFooterWrapper = React.memo(function SynthesisFooterWrapper({
    nodeId,
}: SynthesisFooterWrapperProps) {
    const nodeData = useNodeData(nodeId);
    const { reSynthesize } = useSynthesis();

    const sourceNodeIds = useMemo((): readonly string[] => {
        const ids = nodeData?.synthesisSourceIds;
        if (!Array.isArray(ids)) return [];
        return ids;
    }, [nodeData]);

    const handleReSynthesize = useCallback(() => {
        reSynthesize(nodeId).catch((e: unknown) => captureError(e));
    }, [nodeId, reSynthesize]);

    if (sourceNodeIds.length === 0) return null;

    return (
        <SynthesisFooter
            sourceCount={sourceNodeIds.length}
            sourceNodeIds={sourceNodeIds}
            onReSynthesize={handleReSynthesize}
        />
    );
});
