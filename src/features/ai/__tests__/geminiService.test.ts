/**
 * Gemini Service Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateContent, generateContentWithContext } from '../services/geminiService';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GeminiService', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('generateContent', () => {
        it('should call API with correct prompt', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Generated response' }]
                        }
                    }]
                }),
            });

            const result = await generateContent('Create a LinkedIn post');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toBe('Generated response');
        });

        it('should throw error on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            await expect(generateContent('Test')).rejects.toThrow('AI generation failed');
        });

        it('should throw error on quota exceeded', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
            });

            await expect(generateContent('Test')).rejects.toThrow('quota exceeded');
        });
    });

    describe('generateContentWithContext', () => {
        it('should call generateContent directly when context is empty', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Direct response' }]
                        }
                    }]
                }),
            });

            const result = await generateContentWithContext('Create something', []);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toBe('Direct response');
        });

        it('should include all context items in API request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Context-aware response' }]
                        }
                    }]
                }),
            });

            const contextChain = ['New York info', 'Washington info'];
            const result = await generateContentWithContext('Tell me about US cities', contextChain);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toBe('Context-aware response');

            // Verify the request body includes context
            const callArgs = mockFetch.mock.calls[0] as [string, { body: string }] | undefined;
            expect(callArgs).toBeDefined();
            const requestBody = JSON.parse(callArgs![1].body);
            const promptText = requestBody.contents[0].parts[0].text;

            expect(promptText).toContain('New York info');
            expect(promptText).toContain('Washington info');
            expect(promptText).toContain('Tell me about US cities');
        });

        it('should use chainGeneration system prompt when context provided', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{ text: 'Chain response' }]
                        }
                    }]
                }),
            });

            await generateContentWithContext('Build on this', ['Previous idea']);

            const callArgs = mockFetch.mock.calls[0] as [string, { body: string }] | undefined;
            expect(callArgs).toBeDefined();
            const requestBody = JSON.parse(callArgs![1].body);
            const promptText = requestBody.contents[0].parts[0].text;

            // Should contain chain-specific language
            expect(promptText).toContain('idea evolution');
        });

        it('should handle API errors correctly', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('AI generation failed');
        });

        it('should handle quota exceeded errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
            });

            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('quota exceeded');
        });
    });
});
