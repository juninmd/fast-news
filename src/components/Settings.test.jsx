import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import * as ollamaService from '../services/ollamaService';
import * as geminiService from '../services/geminiService';

// Mock the ollama service
vi.mock('../services/ollamaService', () => ({
    summarizeWithOllama: vi.fn(),
}));

vi.mock('../services/geminiService', () => ({
    testGeminiConnection: vi.fn(),
}));

describe('Settings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders nothing when not open', () => {
        const { container } = render(<Settings isOpen={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders settings modal when open', () => {
        render(<Settings isOpen={true} />);
        expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('loads ollama url from local storage', async () => {
        localStorage.setItem('ollama_url', 'http://test-url');
        render(<Settings isOpen={true} />);

        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        const input = await screen.findByPlaceholderText('http://localhost:11434');
        expect(input).toHaveValue('http://test-url');
    });

    it('updates ollama url state on input change', async () => {
        render(<Settings isOpen={true} />);
        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        const input = await screen.findByPlaceholderText('http://localhost:11434');
        fireEvent.change(input, { target: { value: 'http://new-url' } });
        expect(input).toHaveValue('http://new-url');
    });

    it('saves settings to local storage and calls onSave', async () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));
        const input = await screen.findByPlaceholderText('http://localhost:11434');
        fireEvent.change(input, { target: { value: 'http://saved-url' } });

        const saveButton = screen.getByRole('button', { name: /Salvar Alterações/i });
        fireEvent.click(saveButton);

        expect(localStorage.getItem('ollama_url')).toBe('http://saved-url');
        expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
            ollamaUrl: 'http://saved-url'
        }));
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('closes modal without saving when cancel is clicked', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
        fireEvent.click(cancelButton);

        expect(onSaveMock).not.toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('allows adding and removing custom feeds', async () => {
        render(<Settings isOpen={true} />);

        // Navigate to 'Fontes' tab
        fireEvent.click(screen.getByRole('button', { name: /Fontes/i }));

        // Wait for the input to confirm tab switch
        const urlInput = await screen.findByPlaceholderText('https://exemplo.com/rss');
        const addButton = screen.getByTestId('add-feed-btn');

        // Type new URL
        fireEvent.change(urlInput, { target: { value: 'https://test.com/rss' } });

        expect(urlInput).toHaveValue('https://test.com/rss');
        expect(addButton).not.toBeDisabled();

        // Add feed
        fireEvent.click(addButton);

        // Check if added (it might take a re-render)
        await waitFor(() => {
             expect(screen.getByText('https://test.com/rss')).toBeInTheDocument();
        });

        // Remove it
        // Note: index might vary if default feeds existed, but here we assume none or this is appended.
        // Wait, default custom feeds is empty [] in this test.
        // So index is 0.
        const removeButton = screen.getByTestId('remove-feed-btn-0');
        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(screen.queryByText('https://test.com/rss')).not.toBeInTheDocument();
        });
    });

    it('shows success message when ollama connection test passes', async () => {
        ollamaService.summarizeWithOllama.mockResolvedValue('Summary');
        render(<Settings isOpen={true} />);

        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        await screen.findByText('URL do Ollama');

        // Ensure connection button is present.
        // The text is 'Testar Conexão' initially.
        const testButton = await screen.findByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Conectado')).toBeInTheDocument();
        });
    });

    it('shows error message when ollama connection test fails', async () => {
        ollamaService.summarizeWithOllama.mockRejectedValue(new Error('Connection failed'));
        render(<Settings isOpen={true} />);

        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        await screen.findByText('URL do Ollama');

        const testButton = await screen.findByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Erro')).toBeInTheDocument();
        });
    });

    it('shows success message when gemini connection test passes', async () => {
        geminiService.testGeminiConnection.mockResolvedValue(true);
        render(<Settings isOpen={true} />);

        // Navigate to IA tab
        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        // Select Gemini
        fireEvent.click(screen.getByText('Google Gemini'));

        // Fill API key to enable button
        const input = await screen.findByPlaceholderText('Insira sua API Key do Google Gemini');
        fireEvent.change(input, { target: { value: 'test-api-key' } });

        const testButton = await screen.findByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Conectado!')).toBeInTheDocument();
        });
    });

    it('shows error message when gemini connection test fails', async () => {
        geminiService.testGeminiConnection.mockRejectedValue(new Error('Connection failed'));
        render(<Settings isOpen={true} />);

        // Navigate to IA tab
        fireEvent.click(screen.getByRole('button', { name: /Inteligência Artificial/i }));

        // Select Gemini
        fireEvent.click(screen.getByText('Google Gemini'));

        // Fill API key to enable button
        const input = await screen.findByPlaceholderText('Insira sua API Key do Google Gemini');
        fireEvent.change(input, { target: { value: 'test-api-key' } });

        const testButton = await screen.findByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Falha na Conexão')).toBeInTheDocument();
        });
    });
});
