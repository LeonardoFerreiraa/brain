import { describe, it, expect } from 'vitest'
import { isValidCspDirective, isSafeExternalUrl } from '../utils/securityUtils'
import { isUnderRoot } from '../utils/pathUtils'

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

// BUG-03: fs:watch-start must validate watchPath against rootFolder
describe('watch-start path traversal guard', () => {
  const root = '/home/user/Brain'

  it('allows vault root itself', () => {
    expect(isUnderRoot('/home/user/Brain', root)).toBe(true)
  })

  it('allows path inside vault', () => {
    expect(isUnderRoot('/home/user/Brain/sub', root)).toBe(true)
  })

  it('rejects /etc', () => {
    expect(isUnderRoot('/etc', root)).toBe(false)
  })

  it('rejects sibling directory', () => {
    expect(isUnderRoot('/home/user/BrainBackup', root)).toBe(false)
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
