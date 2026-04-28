import { useState, useEffect, useRef } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export const useIntersectionObserver = (callback, options = {}) => {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '200px',
      threshold: 0,
      ...options
    });

    return () => observerRef.current?.disconnect();
  }, [callback, options]);

  return observerRef;
};

export const useInView = (threshold = 0.1) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isInView];
};

export const useKeyboardShortcut = (key, callback, modifiers = {}) => {
  useEffect(() => {
    const handler = (e) => {
      const ctrlOrCmd = modifiers.ctrl || modifiers.meta;
      const ctrlHeld = e.ctrlKey || e.metaKey;

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!ctrlOrCmd || ctrlHeld) &&
        (!modifiers.shift || e.shiftKey) &&
        (!modifiers.alt || e.altKey)
      ) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
};

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

export const useReadingProgress = (contentRef) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollable = scrollHeight - clientHeight;
      setProgress(scrollable > 0 ? (scrollTop / scrollable) * 100 : 0);
    };

    window.addEventListener('scroll', calculateProgress, { passive: true });
    return () => window.removeEventListener('scroll', calculateProgress);
  }, [contentRef]);

  return progress;
};