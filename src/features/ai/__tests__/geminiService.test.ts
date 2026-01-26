/**
 * Gemini Service Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateContent, synthesizeNodes } from '../services/geminiService';

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
                    content: 'Generated response',
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

    describe('synthesizeNodes', () => {
        it('should combine multiple node contents', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    content: 'Synthesized idea',
                }),
            });

            const nodeContents = ['Idea A', 'Idea B'];
            const result = await synthesizeNodes(nodeContents);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toBe('Synthesized idea');
        });

        it('should throw if less than 2 nodes', async () => {
            await expect(synthesizeNodes(['Single'])).rejects.toThrow(
                'At least 2 nodes required'
            );
        });
    });
});
