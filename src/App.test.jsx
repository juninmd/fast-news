import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock child components
vi.mock('./components/Feed', () => ({
    default: ({ aiConfig }) => <div data-testid="feed">Feed Component (Key: {aiConfig?.aiSdkApiKey})</div>
}));

vi.mock('./components/TrendingTopics', () => ({
    default: () => <div data-testid="trending-topics">Trending Topics Mock</div>
}));

vi.mock('./components/Settings', () => ({
    default: ({ isOpen, onClose, onSave }) => (
        isOpen ? (
            <div data-testid="settings-modal">
                Settings Modal
                <button type="button" onClick={() => { onSave({ aiSdkApiKey: 'new-api-key' }); onClose(); }}>Save</button>
                <button type="button" onClick={onClose}>Close</button>
            </div>
        ) : null
    )
}));

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders header and feed', () => {
        render(<App />);
        expect(screen.getByText('NewsAI')).toBeInTheDocument();
        expect(screen.getByTestId('feed')).toBeInTheDocument();
    });

    it('shows notification if api key is missing', () => {
        render(<App />);
        expect(screen.getByText(/Por favor configure seu Provedor de IA e Chave de API/)).toBeInTheDocument();

        const buttons = screen.getAllByRole('button', { name: /Configurações/i });
        expect(buttons).toHaveLength(2);
    });

    it('does not show notification if api key is present', () => {
        localStorage.setItem('ai_sdk_api_key', 'test-key');
        render(<App />);
        expect(screen.queryByText(/Por favor configure seu Provedor de IA e Chave de API/)).not.toBeInTheDocument();
    });

    it('opens settings modal when settings button in header is clicked', async () => {
        render(<App />);
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);
        expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();
    });

    it('opens settings modal when notification link is clicked', async () => {
        render(<App />);
        const linkButton = screen.getAllByRole('button', { name: /Configurações/i })[1];
        fireEvent.click(linkButton);
        expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();
    });

    it('updates api key and closes modal on save', async () => {
        render(<App />);

        // Open modal
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);

        // Wait for modal to render and simulate save
        const saveButton = await screen.findByText('Save');
        fireEvent.click(saveButton);

        // Check if modal is closed
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

        // Check if api key was updated in Feed
        expect(screen.getByTestId('feed')).toHaveTextContent('Feed Component (Key: new-api-key)');

        // Notification should disappear
        expect(screen.queryByText(/Por favor configure seu Provedor de IA e Chave de API/)).not.toBeInTheDocument();
    });

    it('closes modal on close', async () => {
        render(<App />);
         // Open modal
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);

        // Wait for modal to render and simulate close
        const closeButton = await screen.findByText('Close');
        fireEvent.click(closeButton);

        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });
});
