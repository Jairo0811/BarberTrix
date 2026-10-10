import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveApiBaseUrl } from '../src/config/envPolicy.ts'

test('development permits an HTTP API for emulator and LAN workflows', () => {
  assert.equal(
    resolveApiBaseUrl('http://10.0.2.2:8080/', 'Development'),
    'http://10.0.2.2:8080',
  )
})

test('production requires HTTPS', () => {
  assert.throws(
    () => resolveApiBaseUrl('http://api.barbertrix.test', 'Production'),
    /must use https in Production/,
  )
})

test('production accepts HTTPS regardless of environment casing or whitespace', () => {
  assert.equal(
    resolveApiBaseUrl('https://api.barbertrix.test///', '  pRoDuCtIoN  '),
    'https://api.barbertrix.test',
  )
})

test('API base URL is required', () => {
  assert.throws(
    () => resolveApiBaseUrl('   ', 'Development'),
    /is required/,
  )
})

test('API base URL must be absolute', () => {
  assert.throws(
    () => resolveApiBaseUrl('/api', 'Development'),
    /valid absolute URL/,
  )
})

test('non HTTP protocols are rejected in every environment', () => {
  assert.throws(
    () => resolveApiBaseUrl('ftp://api.barbertrix.test', 'Development'),
    /must use http or https/,
  )
})
