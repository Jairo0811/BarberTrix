export type Locale = 'es-419' | 'es-ES' | 'en' | 'pt-BR' | 'fr' | 'de' | 'it' | 'nl' | 'ht' | 'pl' | 'ro' | 'sv' | 'da' | 'nb' | 'fi' | 'cs' | 'el' | 'tr' | 'uk' | 'ru' | 'et' | 'lv' | 'lt' | 'sk' | 'sl' | 'hr' | 'sr' | 'bs' | 'bg' | 'sq' | 'mk' | 'hu' | 'is' | 'ga' | 'mt' | 'ca' | 'ka' | 'hy' | 'az';
export type LocalePreference = 'system' | Locale;
export type TranslationValues = Record<string, string | number>;
export type Dictionary = Record<string, string>;
