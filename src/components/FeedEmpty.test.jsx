import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Feed from './Feed';

// Mock empty sources
vi.mock('../services/newsService', () => ({
    fetchNews: vi.fn(),
    FEED_SOURCES: []
}));

vi.mock('./NewsCard', () => ({
    default: () => <div>NewsCard</div>
}));

describe('Feed Empty Sources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles empty feed sources gracefully', async () => {
        // This should trigger the block where nextSources.length === 0
        render(<Feed apiKey="test-key" />);

        await waitFor(() => {
            expect(screen.getByText('Nenhuma notícia encontrada.')).toBeInTheDocument();
        });

        // Also verify that hasMore is false (loading indicator gone, button gone)
        expect(screen.queryByText('Carregando mais notícias...')).not.toBeInTheDocument();
        expect(screen.queryByText('Carregar mais fontes')).not.toBeInTheDocument();
    });
});
