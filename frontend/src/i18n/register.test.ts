import { describe, expect, it } from 'vitest'
import { registerCopy } from './register'

describe('registration localized copy', () => {
  it('provides complete Japanese registration-specific copy', () => {
    const japanese = registerCopy.ja
    const englishKeys = Object.keys(registerCopy.en).sort()
    const japaneseKeys = Object.keys(japanese).sort()

    expect(japaneseKeys).toEqual(englishKeys)
    expect(japanese['register.shopName']).toBe('バーバーショップ名')
    expect(japanese['register.shopNamePlaceholder']).toBe('セントラル・バーバーショップ')
    expect(japanese['register.emailPlaceholder']).toBe('example@barbershop.jp')
    expect(japanese['register.terms']).toBe('利用規約')
    expect(japanese['register.privacy']).toBe('プライバシーポリシー')
  })
})
