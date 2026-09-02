import { describe, expect, it } from 'vitest'
import { registerCopy } from './register'

const completeRegistrationLocales = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja'] as const

describe('registration localized copy', () => {
  it.each(completeRegistrationLocales)('keeps %s registration copy at full key parity with English', locale => {
    expect(Object.keys(registerCopy[locale]).sort()).toEqual(Object.keys(registerCopy.en).sort())
  })

  it('provides native Japanese registration-specific copy', () => {
    const japanese = registerCopy.ja
    expect(japanese['register.shopName']).toBe('バーバーショップ名')
    expect(japanese['register.shopNamePlaceholder']).toBe('セントラル・バーバーショップ')
    expect(japanese['register.emailPlaceholder']).toBe('example@barbershop.jp')
    expect(japanese['register.terms']).toBe('利用規約')
    expect(japanese['register.privacy']).toBe('プライバシーポリシー')
  })
})