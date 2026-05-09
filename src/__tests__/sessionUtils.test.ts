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
