import { describe, expect, it } from 'vitest'
import { isStrongPassword, passwordPolicyHint, passwordPolicyMessage } from './passwordPolicy'

const completeLocales = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja', 'ko', 'zh-CN'] as const

describe('password policy', () => {
  it('accepts only passwords that meet every requirement', () => {
    expect(isStrongPassword('Secure123!')).toBe(true)
    expect(isStrongPassword('short1!A')).toBe(false)
    expect(isStrongPassword('without-number!A')).toBe(false)
    expect(isStrongPassword('WITHOUTLOWER1!')).toBe(false)
    expect(isStrongPassword('withoutupper1!')).toBe(false)
    expect(isStrongPassword('WithoutSymbol1')).toBe(false)
  })

  it.each(completeLocales)('provides localized policy guidance for %s', locale => {
    expect(passwordPolicyMessage(locale)).toBeTruthy()
    expect(passwordPolicyHint(locale)).toBeTruthy()
  })

  it('does not reuse English guidance for complete non-English locales', () => {
    for (const locale of ['pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja', 'ko', 'zh-CN'] as const) {
      expect(passwordPolicyMessage(locale)).not.toBe(passwordPolicyMessage('en'))
      expect(passwordPolicyHint(locale)).not.toBe(passwordPolicyHint('en'))
    }
  })

  it('uses native Korean and Simplified Chinese guidance', () => {
    expect(passwordPolicyMessage('ko')).toContain('비밀번호')
    expect(passwordPolicyMessage('zh-CN')).toContain('密码')
    expect(passwordPolicyHint('ko')).toContain('10자')
    expect(passwordPolicyHint('zh-CN')).toContain('10 个')
  })
})
