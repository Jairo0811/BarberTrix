import type { Locale } from './types';

export const officialLocales = [
  'es-419',
  'en',
  'pt-BR',
  'fr',
  'ht',
  'de',
  'it',
  'ja',
  'ko',
  'zh-CN',
] as const satisfies readonly Locale[];

export const officialLocaleSet = new Set<Locale>(officialLocales);
