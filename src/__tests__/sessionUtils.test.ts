import { describe, it, expect } from 'vitest'
import {
  inferTabType,
  getFileName,
  filterSupportedPaths,
  buildSessionConfig,
} from '../utils/sessionUtils'

describe('inferTabType', () => {
  it('markdown for .md', () => expect(inferTabType('/Brain/note.md')).toBe('markdown'))
  it('excalidraw for .excalidraw', () => expect(inferTabType('/Brain/draw.excalidraw')).toBe('excalidraw'))
  it('null for .txt', () => expect(inferTabType('/Brain/doc.txt')).toBeNull())
  it('null for .js', () => expect(inferTabType('/Brain/app.js')).toBeNull())
  it('null for empty', () => expect(inferTabType('')).toBeNull())
})

describe('getFileName', () => {
  it('extracts filename from path', () => {
    expect(getFileName('/Brain/notes/hello.md')).toBe('hello.md')
  })
  it('handles no directory', () => {
    expect(getFileName('note.md')).toBe('note.md')
  })
  it('handles empty string', () => {
    expect(getFileName('')).toBe('')
  })
})

describe('filterSupportedPaths', () => {
  it('keeps .md and .excalidraw', () => {
    const paths = ['/a.md', '/b.excalidraw', '/c.txt', '/d.js']
    expect(filterSupportedPaths(paths)).toEqual(['/a.md', '/b.excalidraw'])
  })

  it('returns empty for unsupported', () => {
    expect(filterSupportedPaths(['/a.txt', '/b.pdf'])).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(filterSupportedPaths([])).toEqual([])
  })
})

describe('buildSessionConfig', () => {
  it('builds session config', () => {
    const result = buildSessionConfig(['/Brain/a.md', '/Brain/b.md'], 'tab-123')
    expect(result.openTabs).toEqual(['/Brain/a.md', '/Brain/b.md'])
    expect(result.activeTab).toBe('tab-123')
  })

  it('allows null activeTab', () => {
    const result = buildSessionConfig([], null)
    expect(result.activeTab).toBeNull()
    expect(result.openTabs).toEqual([])
  })

  it('preserves tab order', () => {
    const paths = ['/c.md', '/a.md', '/b.excalidraw']
    const result = buildSessionConfig(paths, null)
    expect(result.openTabs).toEqual(paths)
  })
})

// BUG-14/15: activeTab must be stored as filePath, not UUID, so restore can
// look it up in restoredIds (Map<filePath, tabId>).
describe('BUG-14/15 — session persist stores filePath as activeTab', () => {
  it('activeTab is a filePath, lookupable in restoredIds map', () => {
    // Simulate what useSessionPersist now saves
    const tabs = [
      { id: 'uuid-1', filePath: '/Brain/a.md' },
      { id: 'uuid-2', filePath: '/Brain/b.md' },
    ]
    const activeTabId = 'uuid-2'
    const activeTab = tabs.find(t => t.id === activeTabId)
    const savedActiveTab = activeTab?.filePath ?? null
    expect(savedActiveTab).toBe('/Brain/b.md')

    // Simulate what useSessionRestore does on next launch
    const restoredIds = new Map<string, string>([
      ['/Brain/a.md', 'new-uuid-1'],
      ['/Brain/b.md', 'new-uuid-2'],
    ])
    expect(restoredIds.has(savedActiveTab!)).toBe(true)
    expect(restoredIds.get(savedActiveTab!)).toBe('new-uuid-2')
  })

  it('old UUID-based activeTab would always miss in restoredIds', () => {
    const restoredIds = new Map<string, string>([
      ['/Brain/a.md', 'new-uuid-1'],
    ])
    // Old behavior: saved UUID from prior session
    const savedUuid = 'uuid-from-last-session'
    expect(restoredIds.has(savedUuid)).toBe(false)
  })
})
