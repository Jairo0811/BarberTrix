import { describe, expect, it } from 'vitest'
import { registerCopy } from './register'

const completeRegistrationLocales = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja', 'ko', 'zh-CN'] as const

describe('registration localized copy', () => {
  it.each(completeRegistrationLocales)('keeps %s registration copy at full key parity with English', locale => {
    expect(Object.keys(registerCopy[locale]).sort()).toEqual(Object.keys(registerCopy.en).sort())
  })

  it('provides native East Asian registration-specific copy', () => {
    expect(registerCopy.ja['register.shopName']).toBe('バーバーショップ名')
    expect(registerCopy.ko['register.shopName']).toBe('바버샵 이름')
    expect(registerCopy['zh-CN']['register.shopName']).toBe('理发店名称')
    expect(registerCopy.ko['register.terms']).toBe('서비스 약관')
    expect(registerCopy['zh-CN']['register.privacy']).toBe('隐私政策')
  })
})
