import { describe, expect, it } from 'vitest'
import { eastAsiaHomeAuxCopy, getProductHomeAuxCopy } from './eastAsiaHomeAuxCopy'
import { getHomeAuxCopy, homeAuxCopy } from './homeAuxCopy'

const completeLocales = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja'] as const
const commercialPlanNames = ['Free', 'Pro', 'Business']

describe('home auxiliary localization', () => {
  it.each(completeLocales)('provides complete pricing and footer copy for %s', locale => {
    const copy = getHomeAuxCopy(locale)
    expect(copy).toBe(homeAuxCopy[locale])
    expect(copy.plans).toHaveLength(3)
    expect(copy.plans.map(plan => plan.name)).toEqual(commercialPlanNames)
    expect(copy.plans.every(plan => plan.description.length > 0 && plan.features.length >= 5)).toBe(true)
    expect(copy.supportSubject).toBeTruthy()
    expect(copy.slogan).toBeTruthy()
    expect(copy.terms).toBeTruthy()
    expect(copy.privacy).toBeTruthy()
  })

  it.each(['ko', 'zh-CN'] as const)('provides complete East Asian pricing and footer copy for %s', locale => {
    const copy = getProductHomeAuxCopy(locale)
    expect(copy).toBe(eastAsiaHomeAuxCopy[locale])
    expect(copy.plans).toHaveLength(3)
    expect(copy.plans.map(plan => plan.name)).toEqual(commercialPlanNames)
    expect(copy.plans.every(plan => plan.description.length > 0 && plan.features.length >= 5)).toBe(true)
    expect(copy.supportSubject).toBeTruthy()
    expect(copy.slogan).toBeTruthy()
    expect(copy.terms).toBeTruthy()
    expect(copy.privacy).toBeTruthy()
  })

  it('does not reuse English auxiliary copy for complete non-English locales', () => {
    for (const locale of ['pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja'] as const) {
      expect(homeAuxCopy[locale].slogan).not.toBe(homeAuxCopy.en.slogan)
      expect(homeAuxCopy[locale].supportSubject).not.toBe(homeAuxCopy.en.supportSubject)
    }

    for (const locale of ['ko', 'zh-CN'] as const) {
      expect(eastAsiaHomeAuxCopy[locale].slogan).not.toBe(homeAuxCopy.en.slogan)
      expect(eastAsiaHomeAuxCopy[locale].supportSubject).not.toBe(homeAuxCopy.en.supportSubject)
    }
  })

  it('delegates existing locales to the stable home auxiliary resolver', () => {
    expect(getProductHomeAuxCopy('en')).toBe(homeAuxCopy.en)
    expect(getProductHomeAuxCopy('ja')).toBe(homeAuxCopy.ja)
  })
})
