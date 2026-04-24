import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock child components
vi.mock('./components/Feed', () => ({
    default: ({ aiSettings }) => <div data-testid="feed">Feed Component (Key: {aiSettings.apiKey || aiSettings.aiSdkApiKey})</div>
}));

vi.mock('./components/Settings', () => ({
    default: ({ isOpen, onClose, onSave }) => (
        isOpen ? (
            <div data-testid="settings-modal">
                Settings Modal
                <button onClick={() => {
                    onSave({
                        apiKey: 'new-api-key',
                        aiProvider: 'gemini',
                        aiSdkProvider: 'openai',
                        aiSdkApiKey: '',
                        aiSdkModel: ''
                    });
                    onClose();
                }}>Save</button>
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

    it('renders header and feed', async () => {
        render(<App />);
        expect(screen.getByText('NewsAI')).toBeInTheDocument();
        expect(screen.getByTestId('feed')).toBeInTheDocument();
        await waitFor(() => {}); // Wait for Suspense to resolve
    });

    it('shows notification if api key is missing', async () => {
        render(<App />);
        expect(screen.getByText(/Por favor configure sua Chave de API/)).toBeInTheDocument();

        const buttons = screen.getAllByRole('button', { name: /Configurações/i });
        expect(buttons).toHaveLength(2);
        await waitFor(() => {});
    });

    it('does not show notification if gemini api key is present', async () => {
        localStorage.setItem('ai_provider', 'gemini');
        localStorage.setItem('gemini_api_key', 'test-key');
        render(<App />);
        expect(screen.queryByText(/Por favor configure sua Chave de API/)).not.toBeInTheDocument();
        await waitFor(() => {});
    });

    it('does not show notification if ai sdk api key is present', async () => {
        localStorage.setItem('ai_provider', 'aisdk');
        localStorage.setItem('ai_sdk_api_key', 'test-key-sdk');
        render(<App />);
        expect(screen.queryByText(/Por favor configure sua Chave de API/)).not.toBeInTheDocument();
        await waitFor(() => {});
    });

    it('opens settings modal when settings button in header is clicked', async () => {
        render(<App />);
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);
        await waitFor(() => {
            expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
        });
    });

    it('updates api key and closes modal on save', async () => {
        render(<App />);

        // Open modal
        const settingsButton = screen.getAllByRole('button', { name: /Configurações/i })[0];
        fireEvent.click(settingsButton);

        await waitFor(() => {
            expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
        });

        // Simulate save in mock
        fireEvent.click(screen.getByText('Save'));

        // Check if modal is closed
        await waitFor(() => {
            expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
        });

        // Check if api key was updated in Feed
        expect(screen.getByTestId('feed')).toHaveTextContent('Feed Component (Key: new-api-key)');

        // Notification should disappear
        expect(screen.queryByText(/Por favor configure sua Chave de API/)).not.toBeInTheDocument();
    });
});
