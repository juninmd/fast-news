import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsCard from './NewsCard';
import * as ollamaService from '../services/ollamaService';
import * as telegramService from '../services/telegramService';

// Mock the services
vi.mock('../services/ollamaService', () => ({
    summarizeWithOllama: vi.fn(),
}));

vi.mock('../services/telegramService', () => ({
    sendToTelegram: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    summarizeWithGemini: vi.fn(),
}));

const mockItem = {
    title: 'Test News',
    link: 'http://test.com',
    description: '<p>Test description</p>',
    content: 'Test content',
    source: 'Test Source',
    pubDate: '2023-10-27T10:00:00.000Z', // Use ISO string for consistent date parsing
    category: 'Tech',
    thumbnail: 'http://test.com/image.jpg'
};

describe('NewsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders news card with details', () => {
        render(<NewsCard item={mockItem} ollamaUrl="http://test-url" />);
        expect(screen.getByText('Test News')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
        expect(screen.getByText(/27\/10/)).toBeInTheDocument();
        expect(screen.getByText('Test description...')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/image.jpg');
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('handles summarize action', async () => {
        // Mock implementation for this specific test
        const summarizeMock = vi.mocked(ollamaService.summarizeWithOllama).mockResolvedValue('Summary result');

        render(<NewsCard item={mockItem} ollamaUrl="http://test-url" ollamaModel="llama3" aiProvider="ollama" apiKey="" />);

        // Use getAllByTitle because there are multiple buttons (one in overlay, one in footer)
        const summarizeButtons = screen.getAllByTitle('Resumir com IA');
        fireEvent.click(summarizeButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Summary result')).toBeInTheDocument();
        });
        expect(summarizeMock).toHaveBeenCalled();
        expect(ollamaService.summarizeWithOllama).toHaveBeenCalledWith('Test content', 'http://test-url', 'llama3');
    });

    it('shows error if ollama url is missing', async () => {
         vi.spyOn(console, 'error').mockImplementation(() => {});
         render(<NewsCard item={mockItem} ollamaUrl="" aiProvider="ollama" apiKey="" />);

         const summarizeButtons = screen.getAllByTitle('Resumir com IA');
         fireEvent.click(summarizeButtons[0]);

         await waitFor(() => {
             expect(screen.getByText('Configure Ollama.')).toBeInTheDocument();
         });
         expect(ollamaService.summarizeWithOllama).not.toHaveBeenCalled();
    });

    it('shows error if summarization fails', async () => {
        vi.mocked(ollamaService.summarizeWithOllama).mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<NewsCard item={mockItem} ollamaUrl="http://test-url" aiProvider="ollama" apiKey="" />);

        const summarizeButtons = screen.getAllByTitle('Resumir com IA');
        fireEvent.click(summarizeButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Falha ao gerar resumo.')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('handles send to telegram action', async () => {
        const sendMock = vi.mocked(telegramService.sendToTelegram).mockResolvedValue(true);
        // Ensure tokens are provided so the button renders
        render(<NewsCard item={mockItem} telegramBotToken="token" telegramChatId="chatid" />);

        const sendButtons = screen.getAllByTitle('Enviar para Telegram');
        fireEvent.click(sendButtons[0]);

        await waitFor(() => {
            expect(sendMock).toHaveBeenCalled();
        });
    });

    it('extracts image from enclosure', () => {
        const itemWithEnclosure = {
            ...mockItem,
            thumbnail: null,
            enclosure: { link: 'http://test.com/enclosure.jpg' }
        };
        render(<NewsCard item={itemWithEnclosure} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/enclosure.jpg');
    });

    it('extracts image from description if others missing', () => {
        const itemWithImgInDesc = {
            ...mockItem,
            thumbnail: null,
            description: 'Some text <img src="http://test.com/desc.jpg" /> more text'
        };
        render(<NewsCard item={itemWithImgInDesc} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/desc.jpg');
    });

    it('does not render image if none available', () => {
         const itemNoImg = {
            ...mockItem,
            thumbnail: null,
            description: 'No image here'
        };
        render(<NewsCard item={itemNoImg} />);
        expect(screen.queryByRole('img', { name: /Test News/i })).not.toBeInTheDocument();
    });

    it('triggers auto summarization if enabled', async () => {
        const summarizeMock = vi.mocked(ollamaService.summarizeWithOllama).mockResolvedValue('Auto Summary');

        render(<NewsCard item={mockItem} ollamaUrl="http://test-url" autoSummarize={true} aiProvider="ollama" apiKey="" />);

        await waitFor(() => {
            expect(summarizeMock).toHaveBeenCalledWith('Test content', 'http://test-url', undefined);
        });

        expect(screen.getByText('Auto Summary')).toBeInTheDocument();
    });
});
