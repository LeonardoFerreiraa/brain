import { describe, it, expect } from 'vitest'

// Test the pure config logic — migration and merging
// These are extracted as pure functions for testability

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}
interface Config {
  version: number
  rootFolder: string | null
  window: WindowBounds
  session: { openTabs: string[]; activeTab: string | null }
  recentFolders: string[]
  theme: 'system' | 'light' | 'dark'
}

const DEFAULT_CONFIG: Config = {
  version: 1,
  rootFolder: null,
  window: { x: 100, y: 100, width: 1200, height: 800, maximized: false },
  session: { openTabs: [], activeTab: null },
  recentFolders: [],
  theme: 'system',
}

function migrate(raw: Partial<Config>): Config {
  if (!raw.version) raw.version = 1
  return {
    version: raw.version ?? 1,
    rootFolder: raw.rootFolder ?? null,
    window: { ...DEFAULT_CONFIG.window, ...(raw.window ?? {}) },
    session: { openTabs: raw.session?.openTabs ?? [], activeTab: raw.session?.activeTab ?? null },
    recentFolders: raw.recentFolders ?? [],
    theme: raw.theme ?? 'system',
  }
}

function mergeConfig(current: Config, partial: Partial<Config>): Config {
  return {
    ...current,
    ...partial,
    version: current.version,
    window: partial.window ? { ...current.window, ...partial.window } : current.window,
    session: partial.session ? { ...current.session, ...partial.session } : current.session,
    recentFolders: partial.recentFolders ?? current.recentFolders,
  }
}

describe('migrate', () => {
  it('adds version 1 if missing', () => {
    const result = migrate({})
    expect(result.version).toBe(1)
  })

  it('preserves existing version', () => {
    const result = migrate({ version: 1, rootFolder: '/home/user/Brain' })
    expect(result.version).toBe(1)
    expect(result.rootFolder).toBe('/home/user/Brain')
  })

  it('fills defaults for missing fields', () => {
    const result = migrate({ version: 1 })
    expect(result.rootFolder).toBeNull()
    expect(result.theme).toBe('system')
    expect(result.recentFolders).toEqual([])
    expect(result.session.openTabs).toEqual([])
    expect(result.session.activeTab).toBeNull()
  })

  it('deep merges window bounds', () => {
    const result = migrate({ version: 1, window: { x: 200, y: 300, width: 1400, height: 900, maximized: false } })
    expect(result.window.x).toBe(200)
    expect(result.window.width).toBe(1400)
  })
})

describe('mergeConfig', () => {
  const base: Config = { ...DEFAULT_CONFIG, rootFolder: '/Brain' }

  it('replaces arrays wholesale', () => {
    const result = mergeConfig(base, { recentFolders: ['/new'] })
    expect(result.recentFolders).toEqual(['/new'])
  })

  it('deep merges window object', () => {
    const result = mergeConfig(base, { window: { ...base.window, width: 1600 } })
    expect(result.window.width).toBe(1600)
    expect(result.window.x).toBe(100)
  })

  it('deep merges session object', () => {
    const result = mergeConfig(base, { session: { openTabs: ['/Brain/note.md'], activeTab: 'abc' } })
    expect(result.session.openTabs).toEqual(['/Brain/note.md'])
    expect(result.session.activeTab).toBe('abc')
  })

  it('preserves version from current', () => {
    const result = mergeConfig(base, { version: 99 } as Partial<Config>)
    expect(result.version).toBe(1)
  })

  it('updates rootFolder', () => {
    const result = mergeConfig(base, { rootFolder: '/new/Brain' })
    expect(result.rootFolder).toBe('/new/Brain')
  })

  it('updates theme', () => {
    const result = mergeConfig(base, { theme: 'dark' })
    expect(result.theme).toBe('dark')
  })
})
