import { describe, expect, it } from 'vitest'
import { isStrongPassword, passwordPolicyHint, passwordPolicyMessage } from './passwordPolicy'

describe('password policy', () => {
  it('accepts only passwords that meet every requirement', () => {
    expect(isStrongPassword('Secure123!')).toBe(true)
    expect(isStrongPassword('short1!A')).toBe(false)
    expect(isStrongPassword('without-number!A')).toBe(false)
    expect(isStrongPassword('WITHOUTLOWER1!')).toBe(false)
    expect(isStrongPassword('withoutupper1!')).toBe(false)
    expect(isStrongPassword('WithoutSymbol1')).toBe(false)
  })

  it('provides localized policy guidance', () => {
    expect(passwordPolicyMessage('en')).toContain('at least 10 characters')
    expect(passwordPolicyHint('es-419')).toContain('10+ caracteres')
  })
})
