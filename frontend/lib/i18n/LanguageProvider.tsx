"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { dictionaries, type Dict, type Locale } from "./dictionaries";

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <K extends keyof Dict>(namespace: K) => Dict[K];
}

const LanguageContext = createContext<LanguageState | null>(null);
const STORAGE_KEY = "astro-mind-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "vi" || saved === "en") setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    <K extends keyof Dict>(namespace: K): Dict[K] => dictionaries[locale][namespace],
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
