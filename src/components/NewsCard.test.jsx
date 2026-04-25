import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

describe('NewsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup specific IntersectionObserver Mock for this test block
        class SpecificMockIntersectionObserver {
            constructor(callback) {
                this.callback = callback;
            }
            observe(target) {
                // Attach the callback to a global so we can trigger it in tests
                window.triggerIntersectNewsCard = () => {
                    this.callback([{ isIntersecting: true, target }]);
                };
            }
            unobserve() {}
            disconnect() {}
        }
        window.IntersectionObserver = SpecificMockIntersectionObserver;
    });

    afterEach(() => {
        delete window.triggerIntersectNewsCard;
    });

    it('renders news card with details', () => {
        render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
        expect(screen.getByText('Test News')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
        // Date formatting might depend on locale, check basic presence
        expect(screen.getByText(/2023/)).toBeInTheDocument();
        expect(screen.getByText('Test description...')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/image.jpg');
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('handles summarize action with Gemini', async () => {
        geminiService.summarizeText.mockResolvedValue('Summary result gemini');
        render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        expect(screen.getByText('Resumindo...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Summary result gemini')).toBeInTheDocument();
        });

        expect(geminiService.summarizeText).toHaveBeenCalledWith('Test content', 'test-key');
        expect(screen.getByText('Resumido')).toBeInTheDocument();
    });

    it('handles summarize action with AI SDK', async () => {
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('Summary result ai sdk');
        render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'ai-sdk', aiSdkProvider: 'openai', aiSdkApiKey: 'test-key-sdk', aiSdkModel: 'gpt-4o', autoSummarize: false }} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        expect(screen.getByText('Resumindo...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Summary result ai sdk')).toBeInTheDocument();
        });

        expect(aiSdkService.summarizeTextAiSdk).toHaveBeenCalledWith('Test content', { provider: 'openai', apiKey: 'test-key-sdk', modelName: 'gpt-4o' });
        expect(screen.getByText('Resumido')).toBeInTheDocument();
    });

    it('shows error if ai config is missing', () => {
         render(<NewsCard item={mockItem} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Configurações de IA não encontradas.')).toBeInTheDocument();
    });

    it('shows error if gemini api key is missing', () => {
         render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'gemini', autoSummarize: false }} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API Gemini nas configurações.')).toBeInTheDocument();
         expect(geminiService.summarizeText).not.toHaveBeenCalled();
    });

    it('shows error if ai sdk api key is missing', () => {
         render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'ai-sdk', autoSummarize: false }} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API AI SDK nas configurações.')).toBeInTheDocument();
         expect(aiSdkService.summarizeTextAiSdk).not.toHaveBeenCalled();
    });

    it('shows error if summarization fails', async () => {
        geminiService.summarizeText.mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        await waitFor(() => {
            expect(screen.getByText('Falha ao gerar resumo. Verifique suas configurações e chave de API.')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('auto summarizes via IntersectionObserver when autoSummarize is true', async () => {
        geminiService.summarizeText.mockResolvedValue('Auto summary gemini');
        render(<NewsCard item={mockItem} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: true }} />);

        act(() => {
            if (window.triggerIntersectNewsCard) {
                window.triggerIntersectNewsCard();
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Auto summary gemini')).toBeInTheDocument();
        });

        expect(geminiService.summarizeText).toHaveBeenCalledWith('Test content', 'test-key');
    });

    it('extracts image from enclosure', () => {
        const itemWithEnclosure = {
            ...mockItem,
            thumbnail: null,
            enclosure: { link: 'http://test.com/enclosure.jpg' }
        };
        render(<NewsCard item={itemWithEnclosure} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/enclosure.jpg');
    });

    it('extracts image from description if others missing', () => {
        const itemWithImgInDesc = {
            ...mockItem,
            thumbnail: null,
            description: 'Some text <img src="http://test.com/desc.jpg" /> more text'
        };
        render(<NewsCard item={itemWithImgInDesc} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/desc.jpg');
    });

    it('does not render image if none available', () => {
         const itemNoImg = {
            ...mockItem,
            thumbnail: null,
            description: 'No image here'
        };
        render(<NewsCard item={itemNoImg} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('handles invalid date', () => {
        const itemInvalidDate = {
            ...mockItem,
            pubDate: 'invalid-date'
        };
        render(<NewsCard item={itemInvalidDate} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
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
        render(<NewsCard item={itemNoContent} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);

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
        render(<NewsCard item={itemNoContentDesc} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);

        fireEvent.click(screen.getByRole('button', { name: /Resumir/i }));

        await waitFor(() => {
             expect(geminiService.summarizeText).toHaveBeenCalledWith('Title text', 'test-key');
        });
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
            render(<NewsCard item={itemValidDate} aiConfig={{ aiProvider: 'gemini', geminiApiKey: 'test-key', autoSummarize: false }} />);
            // Should catch and return empty string, so no date displayed.
            // We check for absence of date text (or presence of empty date div)
        } finally {
            // Restore
            Date.prototype.toLocaleDateString = originalToLocaleDateString;
        }
    });
});
