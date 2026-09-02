export type Locale = 'es-419' | 'es-ES' | 'en' | 'pt-BR' | 'fr' | 'de' | 'it' | 'nl' | 'ht' | 'pl' | 'ro' | 'sv' | 'da' | 'nb' | 'fi' | 'cs' | 'el' | 'tr' | 'uk' | 'ru';
export type LocalePreference = 'system' | Locale;
export type TranslationValues = Record<string, string | number>;
export type Dictionary = Record<string, string>;
