import { describe, expect, it } from 'vitest'
import { deepRoutesSupplement } from './deepRoutesSupplement'
import { legalSupplement } from './legalSupplement'

type CompleteCoreLocale = keyof typeof deepRoutesSupplement

const locales: CompleteCoreLocale[] = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja']
const sortedKeys = (dictionary: Record<string, string>) => Object.keys(dictionary).sort()

describe('deep route locale coverage', () => {
  it.each(locales)('keeps deep route keys complete for %s', locale => {
    expect(sortedKeys(deepRoutesSupplement[locale])).toEqual(sortedKeys(deepRoutesSupplement.en))
  })

  it.each(locales)('keeps legal keys complete for %s', locale => {
    expect(sortedKeys(legalSupplement[locale])).toEqual(sortedKeys(legalSupplement.en))
  })

  it('contains native representative copy for the first localization wave', () => {
    expect(deepRoutesSupplement['pt-BR']['booking.title']).toBe('Seu tempo também importa')
    expect(deepRoutesSupplement.fr['customer.continue']).toBe('Continuer')
    expect(deepRoutesSupplement.de['route.customer']).toBe('Kundenportal')
    expect(deepRoutesSupplement.it['booking.cancelAppointment']).toBe('Annulla appuntamento')
    expect(deepRoutesSupplement.nl['tv.liveQueue']).toBe('LIVE WACHTRIJ')
    expect(deepRoutesSupplement.ht['route.privacy']).toBe('Konfidansyalite')
    expect(deepRoutesSupplement.ja['verify.successTitle']).toBe('メール確認完了')
  })
})
