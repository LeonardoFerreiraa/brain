import { describe, it, expect } from 'vitest'
import { isValidCspDirective, isSafeExternalUrl } from '../utils/securityUtils'

describe('isValidCspDirective', () => {
  it('validates correct CSP', () => {
    const csp =
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    expect(isValidCspDirective(csp)).toBe(true)
  })

  it('rejects missing object-src none', () => {
    expect(isValidCspDirective("default-src 'self'; frame-ancestors 'none'")).toBe(false)
  })

  it('rejects missing frame-ancestors none', () => {
    expect(isValidCspDirective("default-src 'self'; object-src 'none'")).toBe(false)
  })

  it('rejects missing default-src', () => {
    expect(isValidCspDirective("object-src 'none'; frame-ancestors 'none'")).toBe(false)
  })
})

describe('isSafeExternalUrl', () => {
  it('allows https urls', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
  })

  it('allows http urls', () => {
    expect(isSafeExternalUrl('http://example.com')).toBe(true)
  })

  it('rejects javascript: urls', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects file: urls', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects invalid urls', () => {
    expect(isSafeExternalUrl('not-a-url')).toBe(false)
  })

  it('rejects data: urls', () => {
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })
})
