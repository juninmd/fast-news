import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsCard from './NewsCard';
import * as geminiService from '../services/geminiService';
import * as aiSdkService from '../services/aiSdkService';

vi.mock('../services/geminiService', () => ({
    summarizeText: vi.fn(),
}));

vi.mock('../services/aiSdkService', () => ({
    summarizeTextAiSdk: vi.fn(),
}));

const mockItem = {
    title: 'Test News',
    link: 'http://test.com',
    description: '<p>Test description</p>',
    content: 'Test content',
    source: 'Test Source',
    pubDate: '2023-10-27 10:00:00',
    category: 'Tech',
    thumbnail: 'http://test.com/image.jpg'
};

const defaultSettings = {
    aiProvider: 'gemini',
    apiKey: 'gemini-key',
};

const aiSdkSettings = {
    aiProvider: 'aisdk',
    aiSdkProvider: 'openai',
    aiSdkApiKey: 'ai-sdk-key',
    aiSdkModel: 'gpt-4o'
};

describe('NewsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders news card with details', () => {
        render(<NewsCard item={mockItem} aiSettings={defaultSettings} />);
        expect(screen.getByText('Test News')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
        expect(screen.getByText(/2023/)).toBeInTheDocument();
        expect(screen.getByText('Test description...')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/image.jpg');
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('handles summarize action with Gemini', async () => {
        geminiService.summarizeText.mockResolvedValue('Summary result');
        render(<NewsCard item={mockItem} aiSettings={defaultSettings} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        expect(screen.getByText('Resumindo...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Summary result')).toBeInTheDocument();
        });

        expect(geminiService.summarizeText).toHaveBeenCalledWith('Test content', 'gemini-key');
        expect(screen.getByText('Resumido')).toBeInTheDocument();
    });

    it('handles summarize action with AI SDK', async () => {
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('AI SDK Summary result');
        render(<NewsCard item={mockItem} aiSettings={aiSdkSettings} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        await waitFor(() => {
            expect(screen.getByText('AI SDK Summary result')).toBeInTheDocument();
        });

        expect(aiSdkService.summarizeTextAiSdk).toHaveBeenCalledWith('Test content', {
            provider: 'openai',
            apiKey: 'ai-sdk-key',
            modelName: 'gpt-4o'
        });
    });

    it('shows error if gemini api key is missing', () => {
         render(<NewsCard item={mockItem} aiSettings={{ aiProvider: 'gemini', apiKey: '' }} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API Gemini nas configurações.')).toBeInTheDocument();
         expect(geminiService.summarizeText).not.toHaveBeenCalled();
    });

    it('shows error if ai sdk api key is missing', () => {
         render(<NewsCard item={mockItem} aiSettings={{ aiProvider: 'aisdk', aiSdkProvider: 'google', aiSdkApiKey: '' }} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API google nas configurações.')).toBeInTheDocument();
         expect(aiSdkService.summarizeTextAiSdk).not.toHaveBeenCalled();
    });

    it('shows error if summarization fails', async () => {
        geminiService.summarizeText.mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<NewsCard item={mockItem} aiSettings={defaultSettings} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        await waitFor(() => {
            expect(screen.getByText('Falha ao gerar resumo. Verifique suas configurações e chave de API.')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('extracts image from enclosure', () => {
        const itemWithEnclosure = {
            ...mockItem,
            thumbnail: null,
            enclosure: { link: 'http://test.com/enclosure.jpg' }
        };
        render(<NewsCard item={itemWithEnclosure} aiSettings={defaultSettings} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/enclosure.jpg');
    });

    it('handles intersection observer auto summarization', async () => {
        geminiService.summarizeText.mockResolvedValue('Auto summary');
        // The mock global.IntersectionObserver will trigger visibility instantly.
        render(<NewsCard item={mockItem} aiSettings={defaultSettings} />);

        await waitFor(() => {
            expect(screen.getByText('Auto summary')).toBeInTheDocument();
            expect(geminiService.summarizeText).toHaveBeenCalled();
        });
    });
});
