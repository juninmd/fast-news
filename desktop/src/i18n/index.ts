import { en } from "./en";
import { type MessageKey, ptBR } from "./pt-BR";

export type Language = "pt-BR" | "en";

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "en", label: "English" },
];

const catalogs: Record<Language, Record<MessageKey, string>> = { "pt-BR": ptBR, en };
const STORAGE_KEY = "fastnews.language";

function resolveInitial(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt-BR" || saved === "en") return saved;
    return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
  } catch {
    return "pt-BR";
  }
}

let current: Language = resolveInitial();

export function language(): Language {
  return current;
}

export function locale(): string {
  return current === "pt-BR" ? "pt-BR" : "en-US";
}

export function setLanguage(next: Language): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* armazenamento indisponível: a escolha vale só nesta sessão */
  }
}

export type Params = Record<string, string | number>;

export function t(key: MessageKey, params?: Params): string {
  let text: string = catalogs[current][key] ?? ptBR[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
