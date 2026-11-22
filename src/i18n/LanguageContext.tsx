import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SupportedLanguage } from '../types';
import { translations, SUPPORTED_LANGUAGES, LanguageInfo } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, fallback?: string) => string;
  strings: (typeof translations)['en'];
  supportedLanguages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'retails_gm_language';

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
  onLanguageChange,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && ['en', 'hi', 'ta', 'mr', 'pa', 'my'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  // Keep in sync if initialLanguage from database settings updates
  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
      localStorage.setItem(STORAGE_KEY, initialLanguage);
    }
  }, [initialLanguage]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const strings = translations[language] || translations.en;

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = strings;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English if key missing in selected language
        let enCurrent: any = translations.en;
        for (const enKey of keys) {
          if (enCurrent && typeof enCurrent === 'object' && enKey in enCurrent) {
            enCurrent = enCurrent[enKey];
          } else {
            return fallback || path;
          }
        }
        return typeof enCurrent === 'string' ? enCurrent : fallback || path;
      }
    }

    return typeof current === 'string' ? current : fallback || path;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        strings,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
