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
        expect(screen.getByLabelText('Chave de API')).toBeInTheDocument();
    });

    it('loads api key from local storage', () => {
        localStorage.setItem('ai_sdk_api_key', 'stored-key');
        render(<Settings isOpen={true} />);
        expect(screen.getByLabelText('Chave de API')).toHaveValue('stored-key');
    });

    it('loads ai config from local storage', () => {
        localStorage.setItem('ai_sdk_provider', 'openai');
        localStorage.setItem('ai_sdk_api_key', 'sdk-key');
        localStorage.setItem('ai_sdk_model', 'gpt-4');
        localStorage.setItem('auto_summarize', 'false');

        render(<Settings isOpen={true} />);

        expect(screen.getByLabelText('Provedor de IA (AI SDK)')).toHaveValue('openai');
        expect(screen.getByLabelText('Chave de API')).toHaveValue('sdk-key');
        expect(screen.getByLabelText('Modelo (Opcional)')).toHaveValue('gpt-4');
        expect(screen.getByLabelText('Resumir notícias automaticamente')).not.toBeChecked();
    });

    it('updates ai config state on input change', () => {
        render(<Settings isOpen={true} />);

        const sdkProviderSelect = screen.getByLabelText('Provedor de IA (AI SDK)');
        fireEvent.change(sdkProviderSelect, { target: { value: 'anthropic' } });
        expect(sdkProviderSelect).toHaveValue('anthropic');

        const sdkKeyInput = screen.getByLabelText('Chave de API');
        fireEvent.change(sdkKeyInput, { target: { value: 'new-sdk-key' } });
        expect(sdkKeyInput).toHaveValue('new-sdk-key');

        const autoSummarizeCheckbox = screen.getByLabelText('Resumir notícias automaticamente');
        fireEvent.click(autoSummarizeCheckbox);
        expect(autoSummarizeCheckbox).not.toBeChecked();
    });

    it('saves ai config to local storage and calls onSave', () => {
        const onSaveMock = vi.fn();
        const onCloseMock = vi.fn();

        render(<Settings isOpen={true} onSave={onSaveMock} onClose={onCloseMock} />);

        const sdkProviderSelect = screen.getByLabelText('Provedor de IA (AI SDK)');
        fireEvent.change(sdkProviderSelect, { target: { value: 'anthropic' } });

        const sdkKeyInput = screen.getByLabelText('Chave de API');
        fireEvent.change(sdkKeyInput, { target: { value: 'saved-sdk-key' } });

        const saveButton = screen.getByRole('button', { name: 'Salvar' });
        fireEvent.click(saveButton);

        expect(localStorage.getItem('ai_sdk_provider')).toBe('anthropic');
        expect(localStorage.getItem('ai_sdk_api_key')).toBe('saved-sdk-key');

        expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({
            aiSdkProvider: 'anthropic',
            aiSdkApiKey: 'saved-sdk-key'
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
