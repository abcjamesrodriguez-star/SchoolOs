// ============================================================
// SchoolOS — i18n helper
// ============================================================
import { en } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';

export const languages: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
};

export const defaultLang: Lang = 'es';

const translations = { en, es } as const;

export function useTranslations(lang: Lang) {
  return translations[lang];
}

/** Given a URL pathname, extract the Lang prefix ('en' | 'es').
 *  Falls back to defaultLang if not found. */
export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang as Lang;
  return defaultLang;
}

/** Swap the lang prefix of a pathname.
 *  E.g. switchLang('/es/about', 'en') → '/en/about' */
export function switchLang(pathname: string, targetLang: Lang): string {
  const parts = pathname.split('/');
  // parts[0] is '' (before the leading /), parts[1] is the lang segment
  if (parts[1] === 'en' || parts[1] === 'es') {
    parts[1] = targetLang;
  } else {
    parts.splice(1, 0, targetLang);
  }
  return parts.join('/') || '/';
}
