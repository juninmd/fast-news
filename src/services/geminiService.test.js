import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeText } from './geminiService';
import { GoogleGenerativeAI } from "@google/generative-ai";

vi.mock("@google/generative-ai");

describe('geminiService', () => {
    let mockGenerateContent;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateContent = vi.fn();

        // Properly mock the class constructor
        // GoogleGenerativeAI is a named export, so when mocked it's a spy
        // We need to make sure it behaves like a class constructor

        GoogleGenerativeAI.prototype.getGenerativeModel = vi.fn().mockReturnValue({
            generateContent: mockGenerateContent
        });
    });

    it('should throw error if api key is missing', async () => {
        await expect(summarizeText('some text', '')).rejects.toThrow('API Key is missing.');
        await expect(summarizeText('some text', null)).rejects.toThrow('API Key is missing.');
    });

    it('should summarize text successfully', async () => {
        const mockResponse = {
            response: {
                text: () => 'Summary text',
            },
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const summary = await summarizeText('Original text', 'fake-key');

        expect(GoogleGenerativeAI).toHaveBeenCalledWith('fake-key');
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Original text'));
        expect(summary).toBe('Summary text');
    });

    it('should throw error if generation fails', async () => {
        const mockError = new Error('Generation failed');
        mockGenerateContent.mockRejectedValue(mockError);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(summarizeText('Original text', 'fake-key')).rejects.toThrow('Generation failed');
        expect(consoleSpy).toHaveBeenCalledWith('Error summarizing text:', mockError);

        consoleSpy.mockRestore();
    });
});
