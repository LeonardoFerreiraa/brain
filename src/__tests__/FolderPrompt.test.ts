import { describe, it, expect } from 'vitest'

// Pure validation logic extracted for testing
function validate(p: string): string | null {
  if (p === '~' || p === '/home' || p.match(/^\/home\/[^/]+\s*$/)) {
    return 'Warning: selecting your home directory may be slow. Continue?'
  }
  if (p === '/' || p === '/root') {
    return 'Warning: selecting filesystem root is not recommended. Continue?'
  }
  return null
}

describe('FolderPrompt validation', () => {
  it('returns warning for home dir', () => {
    expect(validate('/home/user')).toContain('Warning')
  })

  it('returns warning for root /', () => {
    expect(validate('/')).toContain('Warning')
  })

  it('returns warning for /root', () => {
    expect(validate('/root')).toContain('Warning')
  })

  it('returns null for normal path', () => {
    expect(validate('/home/user/Brain')).toBeNull()
  })

  it('returns null for ~/Brain', () => {
    expect(validate('~/Brain')).toBeNull()
  })

  it('returns null for /tmp/brain', () => {
    expect(validate('/tmp/brain')).toBeNull()
  })
})
