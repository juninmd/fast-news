/** Pequenos booleanos guardados no navegador (não passam pelo Rust). */

export function readFlag(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}
