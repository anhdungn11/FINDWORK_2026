import { create } from "zustand";
import type { Locale, TranslationDictionary } from "./types";
import { vi } from "./translations/vi";
import { en } from "./translations/en";

const STORAGE_KEY = "findwork.locale";

function getInitialLocale(): Locale {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)?.toLowerCase();
      if (stored === "vi" || stored === "en") {
        return stored;
      }
    }
  } catch {
    // LocalStorage may be blocked or restricted
  }
  return "vi";
}

function syncDocumentLang(locale: Locale) {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = locale === "vi" ? "vi" : "en";
  }
}

export interface I18nState {
  locale: Locale;
  t: TranslationDictionary;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
}

const initialLocale = getInitialLocale();
syncDocumentLang(initialLocale);

export const useI18n = create<I18nState>((set, get) => ({
  locale: initialLocale,
  t: initialLocale === "en" ? en : vi,
  setLocale: (next: Locale) => {
    const valid: Locale = next === "en" ? "en" : "vi";
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, valid);
      }
    } catch {
      // Storage restricted
    }
    syncDocumentLang(valid);
    set({ locale: valid, t: valid === "en" ? en : vi });
  },
  toggleLocale: () => {
    const current = get().locale;
    const next = current === "vi" ? "en" : "vi";
    get().setLocale(next);
  },
}));

/**
 * Returns current locale outside React components
 */
export function getCurrentLocale(): Locale {
  return useI18n.getState().locale;
}
