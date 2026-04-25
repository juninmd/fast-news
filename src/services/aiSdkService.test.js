import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeTextAiSdk } from './aiSdkService';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

vi.mock('ai', () => ({
    generateText: vi.fn()
}));

vi.mock('@ai-sdk/openai', () => ({
    createOpenAI: vi.fn()
}));
vi.mock('@ai-sdk/anthropic', () => ({
    createAnthropic: vi.fn()
}));
vi.mock('@ai-sdk/google', () => ({
    createGoogleGenerativeAI: vi.fn()
}));
vi.mock('@ai-sdk/mistral', () => ({
    createMistral: vi.fn()
}));

describe('aiSdkService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty string if no text', async () => {
        const result = await summarizeTextAiSdk('', { provider: 'openai', apiKey: 'test' });
        expect(result).toBe('');
    });

    it('throws error if provider or apiKey is missing', async () => {
        await expect(summarizeTextAiSdk('text', {})).rejects.toThrow('Provider and API Key are required.');
        await expect(summarizeTextAiSdk('text', { provider: 'openai' })).rejects.toThrow('Provider and API Key are required.');
        await expect(summarizeTextAiSdk('text', { apiKey: 'test' })).rejects.toThrow('Provider and API Key are required.');
    });

    it('throws error for unsupported provider', async () => {
        await expect(summarizeTextAiSdk('text', { provider: 'unsupported', apiKey: 'test' })).rejects.toThrow('Unsupported provider: unsupported');
    });

    it('calls generateText with correct config for openai', async () => {
        const mockProviderFn = vi.fn().mockReturnValue('mocked-model-instance');
        createOpenAI.mockReturnValue(mockProviderFn);
        generateText.mockResolvedValue({ text: 'Summary result' });

        const result = await summarizeTextAiSdk('original text', { provider: 'openai', apiKey: 'test-key' });

        expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
        expect(mockProviderFn).toHaveBeenCalledWith('gpt-3.5-turbo');
        expect(generateText).toHaveBeenCalledWith({
            model: 'mocked-model-instance',
            prompt: expect.stringContaining('original text')
        });
        expect(result).toBe('Summary result');
    });

    it('uses custom model if provided', async () => {
        const mockProviderFn = vi.fn().mockReturnValue('mocked-model-instance');
        createOpenAI.mockReturnValue(mockProviderFn);
        generateText.mockResolvedValue({ text: 'Summary result' });

        await summarizeTextAiSdk('original text', { provider: 'openai', apiKey: 'test-key', modelName: 'gpt-4o' });

        expect(mockProviderFn).toHaveBeenCalledWith('gpt-4o');
    });

    it('handles generation errors', async () => {
        const mockProviderFn = vi.fn().mockReturnValue('mocked-model-instance');
        createOpenAI.mockReturnValue(mockProviderFn);
        generateText.mockRejectedValue(new Error('Generation Error'));

        await expect(summarizeTextAiSdk('original text', { provider: 'openai', apiKey: 'test-key' })).rejects.toThrow('Generation Error');
    });
});
