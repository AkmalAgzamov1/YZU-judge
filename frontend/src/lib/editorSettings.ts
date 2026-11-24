const FONT_KEY = "yzu-judge:editor-font-size";

export const EDITOR_FONT_DEFAULT = 14;
export const EDITOR_FONT_MIN = 11;
export const EDITOR_FONT_MAX = 24;

export function clampEditorFontSize(size: number) {
  return Math.max(EDITOR_FONT_MIN, Math.min(EDITOR_FONT_MAX, Math.round(size)));
}

export function loadEditorFontSize() {
  try {
    const value = Number(localStorage.getItem(FONT_KEY));
    return Number.isFinite(value) && value > 0 ? clampEditorFontSize(value) : EDITOR_FONT_DEFAULT;
  } catch {
    return EDITOR_FONT_DEFAULT;
  }
}

export function saveEditorFontSize(size: number) {
  try {
    localStorage.setItem(FONT_KEY, String(clampEditorFontSize(size)));
  } catch {
    // Storage can be unavailable; the current page still uses the chosen size.
  }
}
