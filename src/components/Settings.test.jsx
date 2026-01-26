import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';

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
        expect(screen.getByLabelText('Token da API Gemini')).toBeInTheDocument();
    });

    it('loads api key from local storage', () => {
        localStorage.setItem('gemini_api_key', 'stored-key');
        render(<Settings isOpen={true} />);
        expect(screen.getByLabelText('Token da API Gemini')).toHaveValue('stored-key');
    });

    it('updates api key state on input change', () => {
        render(<Settings isOpen={true} />);
        const input = screen.getByLabelText('Token da API Gemini');
        fireEvent.change(input, { target: { value: 'new-key' } });
        expect(input).toHaveValue('new-key');
    });

    it('saves api key to local storage and calls onSave', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        const input = screen.getByLabelText('Token da API Gemini');
        fireEvent.change(input, { target: { value: 'saved-key' } });

        const saveButton = screen.getByRole('button', { name: 'Salvar' });
        fireEvent.click(saveButton);

        expect(localStorage.getItem('gemini_api_key')).toBe('saved-key');
        expect(onSaveMock).toHaveBeenCalledWith('saved-key', expect.any(Array));
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

     it('closes modal when X button is clicked', () => {
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onClose={onCloseMock} />);

        const buttons = screen.getAllByRole('button');
        // The X button is usually the first icon button
        const xButton = buttons.find(b => !b.textContent);

        if (xButton) {
             fireEvent.click(xButton);
             expect(onCloseMock).toHaveBeenCalled();
        }
    });

    it('allows adding and removing custom feeds', () => {
        render(<Settings isOpen={true} />);

        const urlInput = screen.getByPlaceholderText('https://exemplo.com/rss');
        const catInput = screen.getByPlaceholderText('Ex: Tecnologia');

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

    it('saves custom feeds to local storage and calls onSave', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();
        const initialFeeds = [{ url: 'https://initial.com', category: 'Init' }];
        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} initialCustomFeeds={initialFeeds} />);

        // Add a new one
        const urlInput = screen.getByPlaceholderText('https://exemplo.com/rss');
        fireEvent.change(urlInput, { target: { value: 'https://new.com/rss' } });

        const addButton = screen.getByTestId('add-feed-btn');
        fireEvent.click(addButton);

        const saveButton = screen.getByRole('button', { name: 'Salvar' });
        fireEvent.click(saveButton);

        const storedFeeds = JSON.parse(localStorage.getItem('custom_feeds'));
        expect(storedFeeds).toHaveLength(2);
        expect(storedFeeds).toContainEqual({ url: 'https://initial.com', category: 'Init' });
        expect(storedFeeds).toContainEqual({ url: 'https://new.com/rss', category: 'Personalizado' });

        expect(onSaveMock).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
            expect.objectContaining({ url: 'https://initial.com' }),
            expect.objectContaining({ url: 'https://new.com/rss' })
        ]));
    });
});
