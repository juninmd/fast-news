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
        expect(onSaveMock).toHaveBeenCalledWith('saved-key');
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
        const xButton = buttons.find(b => !b.textContent);

        if (xButton) {
             fireEvent.click(xButton);
             expect(onCloseMock).toHaveBeenCalled();
        }
    });
});
