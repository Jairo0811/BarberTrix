export type Locale = 'es-419' | 'es-ES' | 'en' | 'pt-BR' | 'fr' | 'de' | 'it' | 'nl' | 'ht';
export type LocalePreference = 'system' | Locale;
export type TranslationValues = Record<string, string | number>;
export type Dictionary = Record<string, string>;
