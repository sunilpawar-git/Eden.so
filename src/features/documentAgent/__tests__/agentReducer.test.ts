/**
 * Agent Reducer Tests — pure state machine transitions
 */
import { describe, it, expect } from 'vitest';
import { agentReducer } from '../hooks/agentReducer';
import { INITIAL_AGENT_STATE } from '../types/documentAgent';
import type { AgentState } from '../types/documentAgent';
import { createMockExtraction } from './fixtures/extractionFixtures';

const mockResult = createMockExtraction({
    summary: 'Test summary',
    keyFacts: ['fact1'],
    actionItems: ['action1'],
    questions: ['question1'],
});

describe('agentReducer', () => {
    it('START_ANALYSIS sets status to analyzing and clears previous state', () => {
        const prev: AgentState = {
            status: 'failed',
            result: null,
            insightNodeId: null,
            error: 'old error',
        };

        const next = agentReducer(prev, { type: 'START_ANALYSIS' });

        expect(next.status).toBe('analyzing');
        expect(next.result).toBeNull();
        expect(next.insightNodeId).toBeNull();
        expect(next.error).toBeNull();
    });

    it('ANALYSIS_COMPLETE stores result and insightNodeId', () => {
        const analyzing: AgentState = { ...INITIAL_AGENT_STATE, status: 'analyzing' };

        const next = agentReducer(analyzing, {
            type: 'ANALYSIS_COMPLETE',
            payload: mockResult,
            insightNodeId: 'insight-abc',
        });

        expect(next.status).toBe('complete');
        expect(next.result).toBe(mockResult);
        expect(next.insightNodeId).toBe('insight-abc');
        expect(next.error).toBeNull();
    });

    it('ANALYSIS_FAILED stores error and clears result', () => {
        const analyzing: AgentState = { ...INITIAL_AGENT_STATE, status: 'analyzing' };

        const next = agentReducer(analyzing, {
            type: 'ANALYSIS_FAILED',
            error: 'API timeout',
        });

        expect(next.status).toBe('failed');
        expect(next.result).toBeNull();
        expect(next.insightNodeId).toBeNull();
        expect(next.error).toBe('API timeout');
    });

    it('RESET returns INITIAL_AGENT_STATE', () => {
        const complete: AgentState = {
            status: 'complete',
            result: mockResult,
            insightNodeId: 'insight-123',
            error: null,
        };

        const next = agentReducer(complete, { type: 'RESET' });

        expect(next).toEqual(INITIAL_AGENT_STATE);
    });

    it('returns initial state from idle', () => {
        expect(INITIAL_AGENT_STATE.status).toBe('idle');
        expect(INITIAL_AGENT_STATE.result).toBeNull();
        expect(INITIAL_AGENT_STATE.insightNodeId).toBeNull();
        expect(INITIAL_AGENT_STATE.error).toBeNull();
    });
});
