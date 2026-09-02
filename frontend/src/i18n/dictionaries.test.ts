import { describe, expect, it } from 'vitest'
import { dictionaries } from './dictionaries'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

describe('i18n dictionary completeness', () => {
  it('keeps Japanese at full key parity with English', () => {
    expect(sortedKeys(dictionaries.ja)).toEqual(sortedKeys(dictionaries.en))
  })
})
