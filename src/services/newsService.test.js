import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNews, FEED_SOURCES } from './newsService';

// Mocking the global fetch

global.fetch = vi.fn();

describe('newsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch news from multiple sources and aggregate them', async () => {
        const mockSources = [
            { url: 'http://source1.com/rss', category: 'Tech' },
            { url: 'http://source2.com/rss', category: 'World' },
        ];

        const mockResponse1 = {
            status: 'ok',
            feed: { title: 'Source 1' },
            items: [
                { title: 'News 1', pubDate: '2023-10-27 10:00:00', guid: '1', link: 'l1' },
            ],
        };

        const mockResponse2 = {
            status: 'ok',
            feed: { title: 'Source 2' },
            items: [
                { title: 'News 2', pubDate: '2023-10-27 11:00:00', guid: '2', link: 'l2' },
            ],
        };

        fetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse1),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse2),
            });

        const news = await fetchNews(mockSources);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(news).toHaveLength(2);

        // Should be sorted by date (newest first)
        expect(news[0].title).toBe('News 2');
        expect(news[1].title).toBe('News 1');

        expect(news[0].source).toBe('Source 2');
        expect(news[0].category).toBe('World');
    });

    it('should handle fetch errors gracefully', async () => {
         const mockSources = [
            { url: 'http://source1.com/rss', category: 'Tech' },
        ];

        fetch.mockRejectedValueOnce(new Error('Network Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const news = await fetchNews(mockSources);

        expect(news).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching'), expect.any(Error));

        consoleSpy.mockRestore();
    });

    it('should ignore failed api responses (status != ok)', async () => {
        const mockSources = [
            { url: 'http://source1.com/rss', category: 'Tech' },
        ];

        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ status: 'error' }),
        });

        const news = await fetchNews(mockSources);

        expect(news).toHaveLength(0);
    });

    it('should handle invalid dates in sorting', async () => {
         const mockSources = [
            { url: 'http://source1.com/rss', category: 'Tech' },
        ];

        const mockResponse = {
            status: 'ok',
            feed: { title: 'Source 1' },
            items: [
                { title: 'News 1', pubDate: 'invalid-date', guid: '1', link: 'l1' },
                 { title: 'News 2', pubDate: '2023-10-27 10:00:00', guid: '2', link: 'l2' },
            ],
        };

        fetch.mockResolvedValueOnce({
             json: () => Promise.resolve(mockResponse),
        });

        const news = await fetchNews(mockSources);

        // Invalid date should be pushed to the end or treated as older
        // Logic: if (isNaN(dateA)) return 1; (A is greater/later in index)
        // if (isNaN(dateB)) return -1;
        // So News 1 (invalid) should be after News 2

        expect(news[0].title).toBe('News 2');
        expect(news[1].title).toBe('News 1');
    });

    it('should use item link as id if guid is missing', async () => {
        const mockSources = [
             { url: 'http://source1.com/rss', category: 'Tech' },
        ];

        const mockResponse = {
            status: 'ok',
            feed: { title: 'Source 1' },
            items: [
                { title: 'News 1', pubDate: '2023-10-27 10:00:00', link: 'http://link.com/1' },
            ],
        };

        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockResponse),
        });

        const news = await fetchNews(mockSources);
        expect(news[0].id).toBe('http://link.com/1');
    });

     it('should use invalid date if both are invalid', async () => {
        const mockSources = [
            { url: 'http://source1.com/rss', category: 'Tech' },
        ];

        const mockResponse = {
            status: 'ok',
            feed: { title: 'Source 1' },
            items: [
                { title: 'News 1', pubDate: 'invalid-date-1', guid: '1', link: 'l1' },
                 { title: 'News 2', pubDate: 'invalid-date-2', guid: '2', link: 'l2' },
            ],
        };

        fetch.mockResolvedValueOnce({
             json: () => Promise.resolve(mockResponse),
        });

        const news = await fetchNews(mockSources);
        // The sorting stability might depend on browser implementation if both return 1
        // But checking coverage is main goal.
        expect(news).toHaveLength(2);
    });

    it('should use default FEED_SOURCES if no sources provided', async () => {
        // We will mock fetch to return empty json to avoid real network calls
        fetch.mockResolvedValue({
             json: () => Promise.resolve({ status: 'ok', feed: {}, items: [] }),
        });

        await fetchNews();
        expect(fetch).toHaveBeenCalledTimes(FEED_SOURCES.length);
    });

    it('should handle sorting when dateB is invalid', async () => {
        const mockSources = [
             { url: 'http://source1.com/rss', category: 'Tech' },
        ];

         const mockResponse2 = {
            status: 'ok',
            feed: { title: 'Source 1' },
            items: [
                { title: 'News 2', pubDate: '2023-10-27 10:00:00', guid: '2', link: 'l2' },
                { title: 'News 1', pubDate: 'invalid-date', guid: '1', link: 'l1' },
            ],
        };

        fetch.mockResolvedValueOnce({
             json: () => Promise.resolve(mockResponse2),
        });

        const news = await fetchNews(mockSources);
        expect(news[0].title).toBe('News 2');
        expect(news[1].title).toBe('News 1');
    });
});
