import { describe, expect, it } from 'vitest'
import { getHomeAuxCopy, homeAuxCopy } from './homeAuxCopy'

const completeLocales = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja'] as const

describe('home auxiliary localization', () => {
  it.each(completeLocales)('provides complete pricing and footer copy for %s', locale => {
    const copy = getHomeAuxCopy(locale)
    expect(copy).toBe(homeAuxCopy[locale])
    expect(copy.plans).toHaveLength(4)
    expect(copy.plans.every(plan => plan.description.length > 0 && plan.features.length >= 5)).toBe(true)
    expect(copy.supportSubject).toBeTruthy()
    expect(copy.slogan).toBeTruthy()
    expect(copy.terms).toBeTruthy()
    expect(copy.privacy).toBeTruthy()
  })

  it('does not reuse English auxiliary copy for reactivated non-English locales', () => {
    for (const locale of ['pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja'] as const) {
      expect(homeAuxCopy[locale].slogan).not.toBe(homeAuxCopy.en.slogan)
      expect(homeAuxCopy[locale].supportSubject).not.toBe(homeAuxCopy.en.supportSubject)
    }
  })
})