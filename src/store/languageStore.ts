import { create } from 'zustand';
import { translations, type Language, type TranslationKey } from '../i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const getInitialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem('knots_language');
    if (saved === 'tr' || saved === 'en') return saved;
    // Sistem dili Türkçe ise varsayılan Türkçe, aksi halde İngilizce
    const sysLang = navigator.language.toLowerCase();
    if (sysLang.startsWith('tr')) return 'tr';
  } catch {}
  return 'tr'; // Varsayılan Türkçe
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: Language) => {
    try {
      localStorage.setItem('knots_language', lang);
    } catch {}
    set({ language: lang });
  },
  t: (key: TranslationKey, params?: Record<string, string | number>) => {
    const currentLang = get().language;
    let text: string = (translations[currentLang] as any)?.[key] || (translations.en as any)?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return text;
  },
}));

export const useTranslation = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = useLanguageStore((s) => s.t);
  return { language, setLanguage, t };
};
