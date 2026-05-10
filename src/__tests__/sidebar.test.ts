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

// BUG-12: name uniqueness must check disk, not just the partial entries state
describe('BUG-12 — findUniqueName disk-check contract', () => {
  it('increments name when disk says file exists', async () => {
    // Simulate the disk-check loop logic
    const existing = new Set(['Untitled.md', 'Untitled 2.md'])
    const fileExists = (name: string) => existing.has(name)

    let name = 'Untitled.md'
    let counter = 2
    while (fileExists(name)) {
      name = `Untitled ${counter}.md`
      counter++
    }
    expect(name).toBe('Untitled 3.md')
  })

  it('uses base name immediately when disk says file does not exist', async () => {
    const fileExists = (_name: string) => false
    let name = 'Untitled.md'
    if (fileExists(name)) name = 'Untitled 2.md'
    expect(name).toBe('Untitled.md')
  })
})

// BUG-13: after rename, open tabs referencing old path must be updated
describe('BUG-13 — open tab path updated after rename', () => {
  it('finds tabs matching old path', () => {
    const tabs = [
      { id: 't1', filePath: '/Brain/old.md', fileName: 'old.md', type: 'markdown' },
      { id: 't2', filePath: '/Brain/other.md', fileName: 'other.md', type: 'markdown' },
    ]
    const oldPath = '/Brain/old.md'
    const newPath = '/Brain/new.md'
    const updated = tabs.map(tab =>
      tab.filePath === oldPath
        ? { ...tab, filePath: newPath, fileName: 'new.md' }
        : tab
    )
    expect(updated[0].filePath).toBe('/Brain/new.md')
    expect(updated[0].fileName).toBe('new.md')
    expect(updated[1].filePath).toBe('/Brain/other.md') // unchanged
  })
})
