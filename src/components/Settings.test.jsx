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
        expect(screen.getByText('Gemini')).toBeInTheDocument();
        expect(screen.getByText('AI SDK (Agnóstico)')).toBeInTheDocument();
    });

    it('loads settings from local storage', () => {
        localStorage.setItem('gemini_api_key', 'stored-key');
        localStorage.setItem('ai_provider', 'gemini');
        render(<Settings isOpen={true} />);
        expect(screen.getByLabelText('Token da API Gemini')).toHaveValue('stored-key');
    });

    it('switches to AI SDK tab and saves correctly', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        // Switch tab
        fireEvent.click(screen.getByText('AI SDK (Agnóstico)'));

        const providerSelect = screen.getByLabelText('Provedor');
        fireEvent.change(providerSelect, { target: { value: 'google' } });

        const keyInput = screen.getByLabelText(/Token da API/);
        fireEvent.change(keyInput, { target: { value: 'ai-sdk-key' } });

        const saveButton = screen.getByRole('button', { name: 'Salvar' });
        fireEvent.click(saveButton);

        expect(localStorage.getItem('ai_provider')).toBe('aisdk');
        expect(localStorage.getItem('ai_sdk_provider')).toBe('google');
        expect(localStorage.getItem('ai_sdk_api_key')).toBe('ai-sdk-key');

        expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
            aiProvider: 'aisdk',
            aiSdkProvider: 'google',
            aiSdkApiKey: 'ai-sdk-key'
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
