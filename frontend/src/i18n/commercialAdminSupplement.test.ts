import { describe, expect, it } from 'vitest'
import { officialLocales } from './officialLocales'
import { commercialCoreSupplement } from './commercialCoreSupplement'
import { appointmentsAdminSupplement } from './appointmentsAdminSupplement'
import { customersAdminSupplement } from './customersAdminSupplement'
import { paymentsAdminSupplement } from './paymentsAdminSupplement'
import { reportsAdminSupplement } from './reportsAdminSupplement'

const supplements = [
  ['commercial core', commercialCoreSupplement],
  ['appointments admin', appointmentsAdminSupplement],
  ['customers admin', customersAdminSupplement],
  ['payments admin', paymentsAdminSupplement],
  ['reports admin', reportsAdminSupplement],
] as const

describe('commercial admin localization', () => {
  for (const [name, supplement] of supplements) {
    it.each(officialLocales)(`${name}: keeps %s at exact key parity with English`, locale => {
      expect(Object.keys(supplement[locale]).sort()).toEqual(Object.keys(supplement.en).sort())
      expect(Object.values(supplement[locale]).every(value => value.trim().length > 0)).toBe(true)
    })
  }

  it('keeps representative Asian commercial copy native', () => {
    expect(appointmentsAdminSupplement.ja['appointmentsAdmin.title']).toContain('予約')
    expect(customersAdminSupplement.ko['customersAdmin.title']).toContain('고객')
    expect(paymentsAdminSupplement['zh-CN']['paymentsAdmin.title']).toContain('对账')
  })
})
