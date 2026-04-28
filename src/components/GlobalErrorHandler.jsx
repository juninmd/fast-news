import React, { useEffect } from 'react';
import { useToast } from './Toast';

export const GlobalErrorHandler = ({ children }) => {
  const toast = useToast();

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      event.preventDefault();
      toast.error('Erro inesperado. Por favor, recarregue a página.');
      console.error('Unhandled promise rejection:', event.reason);
    };

    const handleError = (event) => {
      toast.error('Algo deu errado. Tentando recuperar...');
      console.error('Global error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [toast]);

  return children;
};

export default GlobalErrorHandler;