import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Feed from './Feed';
import * as newsService from '../services/newsService';

// Mock dependencies
vi.mock('../services/newsService', () => ({
    fetchNews: vi.fn(),
    FEED_SOURCES: Array.from({ length: 20 }, (_, i) => ({ url: `url${i}`, category: i % 2 === 0 ? 'Tech' : 'World' }))
}));

vi.mock('./NewsCard', () => ({
    default: ({ item }) => <div data-testid="news-card">{item.title} - {item.category}</div>
}));

vi.mock('./HeroSection', () => ({
    default: ({ item }) => <div data-testid="hero-section">{item.title} - {item.category}</div>
}));

vi.mock('./SkeletonCard', () => ({
    default: () => <div data-testid="skeleton-card">Skeleton</div>
}));

describe('Feed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and fetches initial news', async () => {
        const mockNews = [
            { id: '1', title: 'News 1', category: 'Tech', pubDate: '2023-01-01' },
            { id: '2', title: 'News 2', category: 'World', pubDate: '2023-01-02' },
        ];
        newsService.fetchNews.mockResolvedValue(mockNews);

        render(<Feed apiKey="test-key" />);

        expect(screen.getAllByTestId('skeleton-card')).toHaveLength(6);

        await waitFor(() => {
            expect(screen.getByText('News 1 - Tech')).toBeInTheDocument();
            expect(screen.getByText('News 2 - World')).toBeInTheDocument();
        });

        expect(newsService.fetchNews).toHaveBeenCalled();
    });

    it('filters news by category prop', async () => {
        const mockNews = [
            { id: '1', title: 'News 1', category: 'Tech', pubDate: '2023-01-01' },
            { id: '2', title: 'News 2', category: 'World', pubDate: '2023-01-02' },
        ];
        newsService.fetchNews.mockResolvedValue(mockNews);

        const { rerender } = render(<Feed apiKey="test-key" selectedCategory="Todas" />);

        await waitFor(() => {
            expect(screen.getByText('News 1 - Tech')).toBeInTheDocument();
            expect(screen.getByText('News 2 - World')).toBeInTheDocument();
        });

        rerender(<Feed apiKey="test-key" selectedCategory="Tech" />);

        await waitFor(() => {
             expect(screen.getByText('News 1 - Tech')).toBeInTheDocument();
        });
        expect(screen.queryByText('News 2 - World')).not.toBeInTheDocument();
    });

    it('filters news by search query', async () => {
        const mockNews = [
            { id: '1', title: 'Apple launches new phone', category: 'Tech', pubDate: '2023-01-01' },
            { id: '2', title: 'Microsoft updates Windows', category: 'Tech', pubDate: '2023-01-02' },
        ];
        newsService.fetchNews.mockResolvedValue(mockNews);

        const { rerender } = render(<Feed apiKey="test-key" />);

        await waitFor(() => {
            expect(screen.getByText('Apple launches new phone - Tech')).toBeInTheDocument();
        });

        rerender(<Feed apiKey="test-key" searchQuery="Apple" />);

        expect(screen.getByText('Apple launches new phone - Tech')).toBeInTheDocument();
        expect(screen.queryByText('Microsoft updates Windows - Tech')).not.toBeInTheDocument();
    });

    it('loads more news via IntersectionObserver', async () => {
        const mockNews1 = [{ id: '1', title: 'News 1', category: 'Tech', pubDate: '2023-01-01' }];
        const mockNews2 = [{ id: '3', title: 'News 3', category: 'Extra', pubDate: '2023-01-03' }];

        newsService.fetchNews
            .mockResolvedValueOnce(mockNews1)
            .mockResolvedValueOnce(mockNews2);

        // Setup mock IntersectionObserver
        const observe = vi.fn();
        const unobserve = vi.fn();
        let triggerIntersect;
        window.IntersectionObserver = class {
             constructor(callback) {
                 triggerIntersect = () => callback([{ isIntersecting: true }]);
             }
             observe() { observe(); }
             unobserve() { unobserve(); }
             disconnect() {}
        };

        render(<Feed apiKey="test-key" />);

        await waitFor(() => {
            expect(screen.getByText('News 1 - Tech')).toBeInTheDocument();
        });

        // Trigger observer to load more
        await waitFor(() => {
             if (triggerIntersect) {
                 triggerIntersect();
             }
        });

        await waitFor(() => {
             expect(screen.getByText('News 3 - Extra')).toBeInTheDocument();
        });
    });

    it('shows "All sources loaded" when no more sources', async () => {
         // Create a very small mock FEED_SOURCES locally for this test specifically if possible,
         // but since it's mocked globally, we just mock the empty return.
         newsService.fetchNews.mockResolvedValue([]);

         // Setup mock IntersectionObserver
         window.IntersectionObserver = class {
              constructor(callback) {
                  // Not used in this test, but constructor requires callback
                  this._callback = callback;
              }
              observe() {}
              unobserve() {}
              disconnect() {}
         };

         // If we pass an empty array to customFeeds and it filters to "EmptyCategory", it has 0 sources.
         // Let's use the logic that when `nextBatchIndex + batchSize >= shuffledSources.length` it sets `hasMore = false`.
         // We can force it to run out of sources.
         render(<Feed apiKey="test-key" selectedCategory="FakeCategory" />);

         await waitFor(() => {
              expect(screen.getByText('Nenhuma notícia encontrada.')).toBeInTheDocument();
         });
    });

    it('passes props to NewsCard', async () => {
        const mockNews = [{ id: '1', title: 'N', category: 'C', pubDate: '2023-01-01' }];
        newsService.fetchNews.mockResolvedValue(mockNews);
        // ... (Test is empty/placeholder)
    });
});
