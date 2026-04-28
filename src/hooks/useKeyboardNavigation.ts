import { useEffect, useCallback, useRef, useState } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect?: (item: T, index: number) => void;
  onOpen?: (item: T, index: number) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  onOpen,
  enabled = true,
}: UseKeyboardNavigationOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  const scrollToFocused = useCallback((index: number) => {
    const element = itemRefs.current.get(index);
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < items.length - 1 ? prev + 1 : 0;
            scrollToFocused(next);
            onSelect?.(items[next], next);
            return next;
          });
          break;

        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : items.length - 1;
            scrollToFocused(next);
            onSelect?.(items[next], next);
            return next;
          });
          break;

        case 'Enter':
        case 'o':
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            e.preventDefault();
            onOpen?.(items[focusedIndex], focusedIndex);
          }
          break;

        case 'Escape':
          setFocusedIndex(-1);
          break;

        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          scrollToFocused(0);
          onSelect?.(items[0], 0);
          break;

        case 'End':
          e.preventDefault();
          const lastIndex = items.length - 1;
          setFocusedIndex(lastIndex);
          scrollToFocused(lastIndex);
          onSelect?.(items[lastIndex], lastIndex);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, items, focusedIndex, onSelect, onOpen, scrollToFocused]);

  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = itemRefs.current.get(focusedIndex);
      element?.focus();
    }
  }, [focusedIndex]);

  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length - 1);
    }
  }, [items.length, focusedIndex]);

  const resetFocus = useCallback(() => setFocusedIndex(-1), []);

  return {
    focusedIndex,
    setFocusedIndex,
    containerRef,
    registerItem,
    resetFocus,
    isFocused: focusedIndex >= 0,
  };
}
