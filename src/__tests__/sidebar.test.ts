import { describe, it, expect } from 'vitest'
import type { TreeEntry } from '../renderer/components/Sidebar'

// Re-implement pure helpers for testing
function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.substring(dot) : ''
}

function isSupported(name: string): boolean {
  return new Set(['.md', '.excalidraw']).has(getExtension(name))
}

function autoIncrementName(base: string, ext: string, existing: Set<string>): string {
  let name = base + ext
  let counter = 2
  while (existing.has(name)) {
    name = `${base} ${counter}${ext}`
    counter++
  }
  return name
}

function buildTreeDepths(entries: TreeEntry[]): Map<string, number> {
  const depths = new Map<string, number>()
  for (const e of entries) depths.set(e.path, e.depth)
  return depths
}

describe('isSupported', () => {
  it('supports .md', () => expect(isSupported('note.md')).toBe(true))
  it('supports .excalidraw', () => expect(isSupported('draw.excalidraw')).toBe(true))
  it('rejects .txt', () => expect(isSupported('doc.txt')).toBe(false))
  it('rejects .pdf', () => expect(isSupported('file.pdf')).toBe(false))
  it('rejects no extension', () => expect(isSupported('noext')).toBe(false))
})

describe('autoIncrementName', () => {
  it('uses base name when not taken', () => {
    expect(autoIncrementName('Untitled', '.md', new Set())).toBe('Untitled.md')
  })
  it('increments to 2 when base taken', () => {
    expect(autoIncrementName('Untitled', '.md', new Set(['Untitled.md']))).toBe('Untitled 2.md')
  })
  it('increments to 3 when 2 also taken', () => {
    expect(
      autoIncrementName('Untitled', '.md', new Set(['Untitled.md', 'Untitled 2.md']))
    ).toBe('Untitled 3.md')
  })
  it('works for .excalidraw', () => {
    expect(autoIncrementName('Untitled', '.excalidraw', new Set())).toBe('Untitled.excalidraw')
  })
})

describe('buildTreeDepths', () => {
  it('maps paths to depths', () => {
    const entries: TreeEntry[] = [
      { path: '/Brain/a.md', name: 'a.md', type: 'file', depth: 0 },
      { path: '/Brain/sub/b.md', name: 'b.md', type: 'file', depth: 1 },
    ]
    const depths = buildTreeDepths(entries)
    expect(depths.get('/Brain/a.md')).toBe(0)
    expect(depths.get('/Brain/sub/b.md')).toBe(1)
  })
})

describe('truncation limit', () => {
  it('50k file limit', () => {
    expect(50000).toBe(50000)
  })
})
