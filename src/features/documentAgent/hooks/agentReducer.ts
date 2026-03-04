/**
 * Agent Reducer — pure state machine for document analysis lifecycle.
 * Isolated from canvas store; used with useReducer in useDocumentAgent.
 */
import { INITIAL_AGENT_STATE } from '../types/documentAgent';
import type { AgentState, AgentAction } from '../types/documentAgent';

export function agentReducer(state: AgentState, action: AgentAction): AgentState {
    switch (action.type) {
        case 'START_ANALYSIS':
            return { status: 'analyzing', result: null, insightNodeId: null, error: null };
        case 'ANALYSIS_COMPLETE':
            return { status: 'complete', result: action.payload, insightNodeId: action.insightNodeId, error: null };
        case 'ANALYSIS_FAILED':
            return { status: 'failed', result: null, insightNodeId: null, error: action.error };
        case 'RESET':
            return INITIAL_AGENT_STATE;
        default:
            return state;
    }
}
