import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean;
  lastChecked: Date | null;
}

interface NetworkContextValue extends NetworkState {
  refresh: () => void;
  isChecking: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastChecked: null,
  });
  const [isChecking, setIsChecking] = useState(false);

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      setState((prev) => ({
        ...prev,
        isOnline: true,
        wasOffline: false,
        lastChecked: new Date(),
      }));
    } catch {
      setState((prev) => ({ ...prev, isOnline: true, lastChecked: new Date() }));
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      refresh();
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      refresh();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  return (
    <NetworkContext.Provider value={{ ...state, refresh, isChecking }}>
      {children}
      <NetworkIndicator />
    </NetworkContext.Provider>
  );
}

function NetworkIndicator() {
  const { isOnline, wasOffline, refresh, isChecking } = useNetwork();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium
        transition-colors duration-300
        ${!isOnline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Você está offline. Verificando conexão...</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span>Conexão restaurada!</span>
          </>
        )}
        <button
          onClick={refresh}
          disabled={isChecking}
          className="ml-2 p-1 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
