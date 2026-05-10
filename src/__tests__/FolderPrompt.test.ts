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

// BUG-18: tilde expansion must happen before saving rootFolder to config
describe('BUG-18 — tilde expansion in expandTilde (main process helper)', () => {
  function expandTilde(p: string, home: string): string {
    if (p === '~') return home
    if (p.startsWith('~/')) return home + p.slice(1)
    return p
  }

  const HOME = '/home/leo'

  it('expands ~/Brain to absolute path', () => {
    expect(expandTilde('~/Brain', HOME)).toBe('/home/leo/Brain')
  })

  it('expands bare ~ to home dir', () => {
    expect(expandTilde('~', HOME)).toBe('/home/leo')
  })

  it('leaves already-absolute path unchanged', () => {
    expect(expandTilde('/home/leo/Brain', HOME)).toBe('/home/leo/Brain')
  })

  it('leaves relative path without ~ unchanged', () => {
    expect(expandTilde('Brain', HOME)).toBe('Brain')
  })
})
