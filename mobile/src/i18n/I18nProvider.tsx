import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { dictionaries } from './dictionaries';
import type { Locale, LocalePreference, TranslationValues } from './types';

type I18nContextValue = { locale: Locale; localePreference: LocalePreference; setLocalePreference: (preference: LocalePreference) => void; t: (key: string, values?: TranslationValues) => string };

const strictLocales = new Set<Locale>(['ja']);

function resolveDeviceLocale(): Locale {
  const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().replace('_', '-');
  if (rawLocale === 'es-es' || rawLocale.startsWith('es-es-')) return 'es-ES';
  if (rawLocale.startsWith('zh-tw') || rawLocale.startsWith('zh-hk') || rawLocale.startsWith('zh-mo') || rawLocale.startsWith('zh-hant')) return 'zh-TW';
  if (rawLocale.startsWith('zh')) return 'zh-CN';
  const aliases: Array<[string[], Locale]> = [
    [['pt'],'pt-BR'],[['fr'],'fr'],[['de'],'de'],[['it'],'it'],[['nl'],'nl'],[['ht'],'ht'],[['pl'],'pl'],[['ro'],'ro'],[['sv'],'sv'],[['da'],'da'],[['nb','nn','no'],'nb'],[['fi'],'fi'],[['cs'],'cs'],[['el'],'el'],[['tr'],'tr'],[['uk'],'uk'],[['ru'],'ru'],[['et'],'et'],[['lv'],'lv'],[['lt'],'lt'],[['sk'],'sk'],[['sl'],'sl'],[['hr'],'hr'],[['sr'],'sr'],[['bs'],'bs'],[['bg'],'bg'],[['sq'],'sq'],[['mk'],'mk'],[['hu'],'hu'],[['is'],'is'],[['ga'],'ga'],[['mt'],'mt'],[['ca'],'ca'],[['ka'],'ka'],[['hy'],'hy'],[['az'],'az'],
    [['ar'],'ar'],[['sw'],'sw'],[['af'],'af'],[['am'],'am'],[['so'],'so'],[['ha'],'ha'],[['yo'],'yo'],[['ig'],'ig'],[['zu'],'zu'],[['xh'],'xh'],[['wo'],'wo'],[['ln'],'ln'],[['rw'],'rw'],[['rn'],'rn'],[['st'],'st'],[['tn'],'tn'],[['sn'],'sn'],[['ny'],'ny'],[['mg'],'mg'],[['ti'],'ti'],[['om'],'om'],[['ak'],'ak'],
    [['ja'],'ja'],[['ko'],'ko'],[['hi'],'hi'],[['bn'],'bn'],[['ur'],'ur'],[['id'],'id'],[['ms'],'ms'],[['vi'],'vi'],[['th'],'th'],[['fil','tl'],'fil'],[['fa'],'fa'],[['ta'],'ta'],[['te'],'te'],[['mr'],'mr'],[['gu'],'gu'],[['pa'],'pa'],[['kn'],'kn'],[['ml'],'ml'],[['ne'],'ne'],[['si'],'si'],[['my'],'my'],[['km'],'km'],[['lo'],'lo'],[['mn'],'mn'],[['kk'],'kk'],[['uz'],'uz'],[['ky'],'ky'],[['tg'],'tg'],
    [['mi'],'mi'],[['sm'],'sm'],[['to'],'to'],[['fj'],'fj'],[['bi'],'bi'],[['tpi'],'tpi'],[['ho'],'ho'],[['gil'],'gil'],[['mh'],'mh'],[['na'],'na'],[['pau'],'pau'],[['tvl'],'tvl'],[['en'],'en'],[['es'],'es-419'],
  ];
  for (const [prefixes, locale] of aliases) if (prefixes.some(prefix => rawLocale === prefix || rawLocale.startsWith(`${prefix}-`))) return locale;
  return 'es-419';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreference] = useState<LocalePreference>('system');
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveDeviceLocale);
  const locale = localePreference === 'system' ? systemLocale : localePreference;
  useEffect(() => { const subscription = AppState.addEventListener('change', state => { if (state === 'active') setSystemLocale(resolveDeviceLocale()); }); return () => subscription.remove(); }, []);
  const value = useMemo<I18nContextValue>(() => ({ locale, localePreference, setLocalePreference, t: (key, values) => { const localized = dictionaries[locale][key]; const template = strictLocales.has(locale) ? localized ?? key : localized ?? dictionaries.en[key] ?? dictionaries['es-419'][key] ?? key; if (!values) return template; return Object.entries(values).reduce((result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)), template); } }), [locale, localePreference]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const context = useContext(I18nContext); if (!context) throw new Error('useI18n must be used inside I18nProvider'); return context; }
