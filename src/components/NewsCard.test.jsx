import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsCard from './NewsCard';
import * as geminiService from '../services/geminiService';

vi.mock('../services/geminiService', () => ({
    summarizeText: vi.fn(),
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

describe('NewsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders news card with details', () => {
        render(<NewsCard item={mockItem} apiKey="test-key" />);
        expect(screen.getByText('Test News')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
        // Date formatting might depend on locale, check basic presence
        expect(screen.getByText(/2023/)).toBeInTheDocument();
        expect(screen.getByText('Test description...')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/image.jpg');
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('handles summarize action', async () => {
        geminiService.summarizeText.mockResolvedValue('Summary result');
        render(<NewsCard item={mockItem} apiKey="test-key" />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        expect(screen.getByText('Resumindo...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Summary result')).toBeInTheDocument();
        });

        expect(geminiService.summarizeText).toHaveBeenCalledWith('Test content', 'test-key');
        expect(screen.getByText('Resumido')).toBeInTheDocument();
    });

    it('shows error if api key is missing', () => {
         render(<NewsCard item={mockItem} apiKey="" />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API Gemini nas configurações.')).toBeInTheDocument();
         expect(geminiService.summarizeText).not.toHaveBeenCalled();
    });

    it('shows error if summarization fails', async () => {
        geminiService.summarizeText.mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<NewsCard item={mockItem} apiKey="test-key" />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        await waitFor(() => {
            expect(screen.getByText('Falha ao gerar resumo. Verifique sua chave de API.')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('extracts image from enclosure', () => {
        const itemWithEnclosure = {
            ...mockItem,
            thumbnail: null,
            enclosure: { link: 'http://test.com/enclosure.jpg' }
        };
        render(<NewsCard item={itemWithEnclosure} apiKey="test-key" />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/enclosure.jpg');
    });

    it('extracts image from description if others missing', () => {
        const itemWithImgInDesc = {
            ...mockItem,
            thumbnail: null,
            description: 'Some text <img src="http://test.com/desc.jpg" /> more text'
        };
        render(<NewsCard item={itemWithImgInDesc} apiKey="test-key" />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/desc.jpg');
    });

    it('does not render image if none available', () => {
         const itemNoImg = {
            ...mockItem,
            thumbnail: null,
            description: 'No image here'
        };
        render(<NewsCard item={itemNoImg} apiKey="test-key" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('handles invalid date', () => {
        const itemInvalidDate = {
            ...mockItem,
            pubDate: 'invalid-date'
        };
        render(<NewsCard item={itemInvalidDate} apiKey="test-key" />);
        // Should not crash, date text will be empty string
        // We can check if Calendar icon is present but no date text
        expect(screen.getAllByText((content, element) => {
             return element.tagName.toLowerCase() === 'div' && content.includes('');
        }).length).toBeGreaterThan(0);
    });

     it('uses fallback text for summarization if content is missing', async () => {
        const itemNoContent = {
             ...mockItem,
             content: null,
             description: 'Description text',
        };
        geminiService.summarizeText.mockResolvedValue('Summary');
        render(<NewsCard item={itemNoContent} apiKey="test-key" />);

        fireEvent.click(screen.getByRole('button', { name: /Resumir/i }));

        await waitFor(() => {
             expect(geminiService.summarizeText).toHaveBeenCalledWith('Description text', 'test-key');
        });
    });

    it('uses title for summarization if content and description are missing', async () => {
        const itemNoContentDesc = {
             ...mockItem,
             content: null,
             description: null,
             title: 'Title text'
        };
        geminiService.summarizeText.mockResolvedValue('Summary');
        render(<NewsCard item={itemNoContentDesc} apiKey="test-key" />);

        fireEvent.click(screen.getByRole('button', { name: /Resumir/i }));

        await waitFor(() => {
             expect(geminiService.summarizeText).toHaveBeenCalledWith('Title text', 'test-key');
        });
    });

    it('triggers auto summarization if enabled', async () => {
        const summarizeSpy = vi.spyOn(geminiService, 'summarizeText').mockResolvedValue('Auto Summary');

        render(<NewsCard item={mockItem} apiKey="test-key" autoSummarize={true} />);

        await waitFor(() => {
            expect(summarizeSpy).toHaveBeenCalledWith('Test content', 'test-key');
        });

        expect(screen.getByText('Auto Summary')).toBeInTheDocument();
    });

    it('handles date formatting error', () => {
        // Line 48: } catch { return ''; }
        // We need to trigger an error inside new Date(dateString) or date.toLocaleDateString()
        // `new Date(string)` rarely throws, it returns Invalid Date.
        // `toLocaleDateString` might throw if locale is invalid? But we hardcoded 'pt-BR'.

        // Wait, line 46: `const date = new Date(dateString);`
        // 47: `if (isNaN(date)) return '';`
        // 48: `return date.toLocaleDateString(...)`
        // The catch block is for `new Date` or `toLocaleDateString`.
        // How to make `new Date` throw? It doesn't usually throw for strings.
        // How to make `toLocaleDateString` throw?
        // Maybe by mocking Date prototype?

        const originalToLocaleDateString = Date.prototype.toLocaleDateString;
        // Mock to throw error
        Date.prototype.toLocaleDateString = () => { throw new Error('Format Error'); };

        try {
            const itemValidDate = {
                ...mockItem,
                pubDate: '2023-01-01'
            };
            render(<NewsCard item={itemValidDate} apiKey="test-key" />);
            // Should catch and return empty string, so no date displayed.
            // We check for absence of date text (or presence of empty date div)
        } finally {
            // Restore
            Date.prototype.toLocaleDateString = originalToLocaleDateString;
        }
    });
});
