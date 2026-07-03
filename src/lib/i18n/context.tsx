"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { uk, type Translations } from "./uk";

type Lang = "uk" | "en";

interface I18nContext {
  t: Translations;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nContext>({
  t: uk,
  lang: "uk",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uk");
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  return (
    <Ctx.Provider value={{ t: uk, lang, setLang }}>{children}</Ctx.Provider>
  );
}

export const useT = () => useContext(Ctx);
export const useLang = () => useContext(Ctx).lang;
