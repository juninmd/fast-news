import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import * as ollamaService from '../services/ollamaService';

vi.mock('../services/ollamaService', () => ({
    summarizeWithOllama: vi.fn(),
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
        expect(screen.getByLabelText('URL Base')).toBeInTheDocument();
    });

    it('loads ollama url from local storage', () => {
        localStorage.setItem('ollama_url', 'http://test-url');
        render(<Settings isOpen={true} />);
        expect(screen.getByLabelText('URL Base')).toHaveValue('http://test-url');
    });

    it('updates ollama url state on input change', () => {
        render(<Settings isOpen={true} />);
        const input = screen.getByLabelText('URL Base');
        fireEvent.change(input, { target: { value: 'http://new-url' } });
        expect(input).toHaveValue('http://new-url');
    });

    it('saves settings to local storage and calls onSave', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        const input = screen.getByLabelText('URL Base');
        fireEvent.change(input, { target: { value: 'http://saved-url' } });

        const saveButton = screen.getByRole('button', { name: 'Salvar' });
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

        const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
        fireEvent.click(cancelButton);

        expect(onSaveMock).not.toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('allows adding and removing custom feeds', () => {
        render(<Settings isOpen={true} />);

        const urlInputs = screen.getAllByPlaceholderText('https://exemplo.com/rss');
        // The one in the "Gerenciar Fontes" section
        const urlInput = urlInputs[urlInputs.length - 1];

        const catInputs = screen.getAllByPlaceholderText('Categoria (Ex: Tecnologia)');
        const catInput = catInputs[catInputs.length - 1];

        fireEvent.change(urlInput, { target: { value: 'https://test.com/rss' } });
        fireEvent.change(catInput, { target: { value: 'TestCat' } });

        const addButton = screen.getByTestId('add-feed-btn');
        fireEvent.click(addButton);

        // Check if added
        expect(screen.getByText('https://test.com/rss')).toBeInTheDocument();
        expect(screen.getByText('TestCat')).toBeInTheDocument();

        // Remove it
        const removeButton = screen.getByTestId('remove-feed-btn-0');
        fireEvent.click(removeButton);

        expect(screen.queryByText('https://test.com/rss')).not.toBeInTheDocument();
    });

    it('shows success message when ollama connection test passes', async () => {
        ollamaService.summarizeWithOllama.mockResolvedValue('Summary');
        render(<Settings isOpen={true} />);

        const testButton = screen.getByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Conectado')).toBeInTheDocument();
        });
    });

    it('shows error message when ollama connection test fails', async () => {
        ollamaService.summarizeWithOllama.mockRejectedValue(new Error('Connection failed'));
        render(<Settings isOpen={true} />);

        const testButton = screen.getByText('Testar Conexão');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText('Erro')).toBeInTheDocument();
        });
    });
});
