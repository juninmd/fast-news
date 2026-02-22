import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeWithGemini } from './geminiService';

globalThis.fetch = vi.fn();

describe('geminiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if api key is missing', async () => {
        await expect(summarizeWithGemini('some text', '')).rejects.toThrow('API Key do Gemini não fornecida.');
        await expect(summarizeWithGemini('some text', null)).rejects.toThrow('API Key do Gemini não fornecida.');
    });

    it('should summarize text successfully', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{ text: 'Summary text' }]
                    }
                }]
            })
        };
        fetch.mockResolvedValue(mockResponse);

        const summary = await summarizeWithGemini('Original text', 'fake-key');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('fake-key'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Original text')
            })
        );
        expect(summary).toBe('Summary text');
    });

    it('should throw error if generation fails', async () => {
        const mockErrorResponse = {
            ok: false,
            statusText: 'Bad Request',
            json: async () => ({ error: { message: 'Generation failed' } })
        };
        fetch.mockResolvedValue(mockErrorResponse);

        // Mock console.error to avoid polluting output
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(summarizeWithGemini('Original text', 'fake-key')).rejects.toThrow('Gemini API Error: Generation failed');
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should throw error if summary is missing in response', async () => {
         const mockResponse = {
            ok: true,
            json: async () => ({
                candidates: [] // No candidates
            })
        };
        fetch.mockResolvedValue(mockResponse);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(summarizeWithGemini('Original text', 'fake-key')).rejects.toThrow('Não foi possível gerar o resumo.');

        consoleSpy.mockRestore();
    });
});
