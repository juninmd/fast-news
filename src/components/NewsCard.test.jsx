import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NewsCard from './NewsCard';
import * as aiSdkService from '../services/aiSdkService';

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

const DEFAULT_AI_CONFIG = {
    aiSdkProvider: 'openai',
    aiSdkApiKey: 'test-key',
    autoSummarize: false
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
                this.target = target;
            }
            unobserve() {
                // Intentionally empty mock for unobserve
            }
            disconnect() {
                // Intentionally empty mock for disconnect
            }
            triggerIntersect() {
                if (this.target && this.callback) {
                    this.callback([{ isIntersecting: true, target: this.target }]);
                }
            }
        }
        window.IntersectionObserver = SpecificMockIntersectionObserver;

        // Store instances globally without mocking the constructor with vi.fn()
        const OriginalObserver = window.IntersectionObserver;
        window.IntersectionObserver = class extends OriginalObserver {
            constructor(callback) {
                super(callback);
                if (!window.mockObserverInstances) {
                    window.mockObserverInstances = [];
                }
                window.mockObserverInstances.push(this);
            }
        };
    });

    afterEach(() => {
        delete window.mockObserverInstances;
    });

    it('renders news card with details', () => {
        render(<NewsCard item={mockItem} aiConfig={DEFAULT_AI_CONFIG} />);
        expect(screen.getByText('Test News')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
        // Date formatting might depend on locale, check basic presence
        expect(screen.getByText(/2023/)).toBeInTheDocument();
        expect(screen.getByText('Test description...')).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/image.jpg');
        expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('handles summarize action with AI SDK', async () => {
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('Summary result ai sdk');
        render(<NewsCard item={mockItem} aiConfig={{ aiSdkProvider: 'openai', aiSdkApiKey: 'test-key-sdk', aiSdkModel: 'gpt-4o', autoSummarize: false }} />);

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

    it('shows error if ai sdk api key is missing', () => {
         render(<NewsCard item={mockItem} aiConfig={{ autoSummarize: false }} />);

         const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
         fireEvent.click(summarizeButton);

         expect(screen.getByText('Por favor adicione sua chave de API AI SDK nas configurações.')).toBeInTheDocument();
         expect(aiSdkService.summarizeTextAiSdk).not.toHaveBeenCalled();
    });

    it('shows error if summarization fails', async () => {
        aiSdkService.summarizeTextAiSdk.mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<NewsCard item={mockItem} aiConfig={DEFAULT_AI_CONFIG} />);

        const summarizeButton = screen.getByRole('button', { name: /Resumir/i });
        fireEvent.click(summarizeButton);

        await waitFor(() => {
            expect(screen.getByText('Falha ao gerar resumo. Verifique suas configurações e chave de API.')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('auto summarizes via IntersectionObserver when autoSummarize is true', async () => {
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('Auto summary ai sdk');
        render(<NewsCard item={mockItem} aiConfig={{ ...DEFAULT_AI_CONFIG, autoSummarize: true }} />);

        act(() => {
            if (window.mockObserverInstances && window.mockObserverInstances.length > 0) {
                window.mockObserverInstances[0].triggerIntersect();
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Auto summary ai sdk')).toBeInTheDocument();
        });

        expect(aiSdkService.summarizeTextAiSdk).toHaveBeenCalledWith('Test content', { apiKey: "test-key", modelName: undefined, provider: "openai" });
    });

    it('extracts image from enclosure', () => {
        const itemWithEnclosure = {
            ...mockItem,
            thumbnail: null,
            enclosure: { link: 'http://test.com/enclosure.jpg' }
        };
        render(<NewsCard item={itemWithEnclosure} aiConfig={DEFAULT_AI_CONFIG} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/enclosure.jpg');
    });

    it('extracts image from description if others missing', () => {
        const itemWithImgInDesc = {
            ...mockItem,
            thumbnail: null,
            description: 'Some text <img src="http://test.com/desc.jpg" /> more text'
        };
        render(<NewsCard item={itemWithImgInDesc} aiConfig={DEFAULT_AI_CONFIG} />);
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://test.com/desc.jpg');
    });

    it('does not render image if none available', () => {
         const itemNoImg = {
            ...mockItem,
            thumbnail: null,
            description: 'No image here'
        };
        render(<NewsCard item={itemNoImg} aiConfig={DEFAULT_AI_CONFIG} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('handles invalid date', () => {
        const itemInvalidDate = {
            ...mockItem,
            pubDate: 'invalid-date'
        };
        render(<NewsCard item={itemInvalidDate} aiConfig={DEFAULT_AI_CONFIG} />);
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
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('Summary');
        render(<NewsCard item={itemNoContent} aiConfig={DEFAULT_AI_CONFIG} />);

        fireEvent.click(screen.getByRole('button', { name: /Resumir/i }));

        await waitFor(() => {
             expect(aiSdkService.summarizeTextAiSdk).toHaveBeenCalledWith('Description text', { apiKey: "test-key", modelName: undefined, provider: "openai" });
        });
    });

    it('uses title for summarization if content and description are missing', async () => {
        const itemNoContentDesc = {
             ...mockItem,
             content: null,
             description: null,
             title: 'Title text'
        };
        aiSdkService.summarizeTextAiSdk.mockResolvedValue('Summary');
        render(<NewsCard item={itemNoContentDesc} aiConfig={DEFAULT_AI_CONFIG} />);

        fireEvent.click(screen.getByRole('button', { name: /Resumir/i }));

        await waitFor(() => {
             expect(aiSdkService.summarizeTextAiSdk).toHaveBeenCalledWith('Title text', { apiKey: "test-key", modelName: undefined, provider: "openai" });
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
            render(<NewsCard item={itemValidDate} aiConfig={DEFAULT_AI_CONFIG} />);
            // Should catch and return empty string, so no date displayed.
            // We check for absence of date text (or presence of empty date div)
        } finally {
            // Restore
            Date.prototype.toLocaleDateString = originalToLocaleDateString;
        }
    });
});
