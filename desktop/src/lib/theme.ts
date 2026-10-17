/** Escolha de tema: persistida em localStorage e aplicada como `data-skin` no `<html>`. */

export type Skin = "escuro" | "claro";

const STORAGE_KEY = "fastnews.skin";
export const SKINS: Skin[] = ["escuro", "claro"];

export function loadSkin(): Skin {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "escuro" || saved === "claro") return saved;
  } catch {
    /* sem armazenamento: cai no padrão */
  }
  return "escuro";
}

export function applySkin(skin: Skin): void {
  document.documentElement.dataset.skin = skin;
}

export function saveSkin(skin: Skin): void {
  try {
    localStorage.setItem(STORAGE_KEY, skin);
  } catch {
    /* idem */
  }
}
