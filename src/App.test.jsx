import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock child components
vi.mock('./components/Feed', () => ({
    default: ({ apiKey }) => <div data-testid="feed">Feed Component (Key: {apiKey})</div>
}));

vi.mock('./components/Settings', () => ({
    default: ({ isOpen, onClose, onSave }) => (
        isOpen ? (
            <div data-testid="settings-modal">
                Settings Modal
                <button onClick={() => { onSave('new-api-key'); onClose(); }}>Save</button>
                <button onClick={onClose}>Close</button>
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
        expect(screen.getByText('News')).toBeInTheDocument();
        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByTestId('feed')).toBeInTheDocument();
    });

    it('shows notification if api key is missing', () => {
        render(<App />);
        expect(screen.getByText(/Por favor configure sua Chave de API Gemini/)).toBeInTheDocument();

        const buttons = screen.getAllByRole('button', { name: /Configurações/i });
        expect(buttons).toHaveLength(2);
    });

    it('does not show notification if api key is present', () => {
        localStorage.setItem('gemini_api_key', 'test-key');
        render(<App />);
        expect(screen.queryByText(/Por favor configure sua Chave de API Gemini/)).not.toBeInTheDocument();
    });

    it('opens settings modal when settings button in header is clicked', () => {
        render(<App />);
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    });

    it('opens settings modal when notification link is clicked', () => {
        render(<App />);
        const linkButton = screen.getAllByRole('button', { name: /Configurações/i })[1];
        fireEvent.click(linkButton);
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    });

    it('updates api key and closes modal on save', async () => {
        render(<App />);

        // Open modal
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);

        // Simulate save in mock
        fireEvent.click(screen.getByText('Save'));

        // Check if modal is closed
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

        // Check if api key was updated in Feed
        expect(screen.getByTestId('feed')).toHaveTextContent('Feed Component (Key: new-api-key)');

        // Notification should disappear
        expect(screen.queryByText(/Por favor configure sua Chave de API Gemini/)).not.toBeInTheDocument();
    });

    it('closes modal on close', () => {
        render(<App />);
         // Open modal
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);

        // Simulate close in mock
        fireEvent.click(screen.getByText('Close'));

        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });
});
