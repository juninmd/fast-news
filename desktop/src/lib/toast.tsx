import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

export type ToastKind = "info" | "ok" | "erro";
type Notify = (toast: { message: string; type?: ToastKind }) => void;

const ToastContext = createContext<Notify>(() => {});

export function useToast(): Notify {
  return useContext(ToastContext);
}

const KIND_CLASS: Record<ToastKind, string> = {
  info: "border-accent/60",
  ok: "border-ok/60",
  erro: "border-danger/60",
};

const DISMISS_MS = 5200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; type: ToastKind }[]>([]);
  const nextId = useRef(0);

  const notify = useCallback<Notify>((toast) => {
    const id = ++nextId.current;
    setItems((list) => [...list, { id, message: toast.message, type: toast.type ?? "info" }]);
    window.setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-80 flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`fn-card motion-safe:animate-entrar bg-raised px-3 py-2 text-sm text-fg shadow-lg ${KIND_CLASS[item.type]}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
