import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { errText } from "./api";
import { readFlag, writeFlag } from "./storage";

export type AsyncState<T> = { data: T | null; error: string | null; loading: boolean; reload: () => void };

/**
 * Runs `load` on mount and whenever `deps` change, ignoring a stale answer that arrives after a newer one.
 * `load` is read through a ref so callers can pass an inline closure without re-running on every render.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[], options: { enabled?: boolean } = {}): AsyncState<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    loadRef.current()
      .then((result) => {
        if (seq.current === id) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((cause) => {
        if (seq.current === id) {
          setError(errText(cause));
          setLoading(false);
        }
      });
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps are the caller's reload triggers
  }, [enabled, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const ALWAYS_ON_TOP_KEY = "fastnews.alwaysOnTop";

/** Reads the saved preference and pushes it to the real window, so the toggle survives a restart. */
export function useAlwaysOnTop(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => readFlag(ALWAYS_ON_TOP_KEY, false));
  useEffect(() => {
    void getCurrentWindow()
      .setAlwaysOnTop(value)
      .catch(() => {});
  }, [value]);
  const set = useCallback((next: boolean) => {
    setValue(next);
    writeFlag(ALWAYS_ON_TOP_KEY, next);
  }, []);
  return [value, set];
}
