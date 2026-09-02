import { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { translations } from "@/i18n/translations";

interface LanguageContextType {
  language: "en";
  setLanguage: (lang: "en") => void;
  t: (key: string) => string;
  dir: "ltr";
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    localStorage.setItem("lms-language", "en");
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, []);

  const t = useCallback(
    (key: string) => translations.en[key] || key,
    [],
  );

  return (
    <LanguageContext.Provider
      value={{ language: "en", setLanguage: () => {}, t, dir: "ltr" }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
