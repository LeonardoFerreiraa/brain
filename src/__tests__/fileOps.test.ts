import { describe, it, expect } from 'vitest'
import {
  autoIncrementName,
  splitFileName,
  validateNewName,
  buildRenamedPath,
  inferFileType,
  buildNewFilePath,
} from '../utils/fileOps'

describe('autoIncrementName', () => {
  it('uses base name when not taken', () => {
    expect(autoIncrementName('Untitled', '.md', new Set())).toBe('Untitled.md')
  })
  it('increments to 2 when taken', () => {
    expect(autoIncrementName('Untitled', '.md', new Set(['Untitled.md']))).toBe('Untitled 2.md')
  })
  it('increments to 3 when 1 and 2 taken', () => {
    const existing = new Set(['Untitled.md', 'Untitled 2.md'])
    expect(autoIncrementName('Untitled', '.md', existing)).toBe('Untitled 3.md')
  })
  it('works for .excalidraw', () => {
    expect(autoIncrementName('Untitled', '.excalidraw', new Set())).toBe('Untitled.excalidraw')
  })
  it('skips to next available', () => {
    const existing = new Set(['Untitled.md', 'Untitled 2.md', 'Untitled 3.md'])
    expect(autoIncrementName('Untitled', '.md', existing)).toBe('Untitled 4.md')
  })
})

describe('splitFileName', () => {
  it('splits .md file', () => {
    expect(splitFileName('note.md')).toEqual({ base: 'note', ext: '.md' })
  })
  it('splits .excalidraw file', () => {
    expect(splitFileName('draw.excalidraw')).toEqual({ base: 'draw', ext: '.excalidraw' })
  })
  it('handles no extension', () => {
    expect(splitFileName('noext')).toEqual({ base: 'noext', ext: '' })
  })
  it('handles dotfile', () => {
    expect(splitFileName('.gitignore')).toEqual({ base: '.gitignore', ext: '' })
  })
})

describe('validateNewName', () => {
  it('accepts valid name', () => expect(validateNewName('my-note.md')).toBeNull())
  it('rejects empty', () => expect(validateNewName('')).toBeTruthy())
  it('rejects whitespace only', () => expect(validateNewName('  ')).toBeTruthy())
  it('rejects slash', () => expect(validateNewName('sub/note.md')).toBeTruthy())
  it('rejects backslash', () => expect(validateNewName('sub\\note.md')).toBeTruthy())
  it('rejects dot prefix', () => expect(validateNewName('.hidden')).toBeTruthy())
})

describe('buildRenamedPath', () => {
  it('builds path in same directory', () => {
    const result = buildRenamedPath('/Brain/note.md', 'renamed.md')
    expect(result).toBe('/Brain/renamed.md')
  })
  it('works with nested paths', () => {
    const result = buildRenamedPath('/Brain/sub/note.md', 'new.md')
    expect(result).toBe('/Brain/sub/new.md')
  })
})

describe('inferFileType', () => {
  it('markdown for .md', () => expect(inferFileType('/Brain/note.md')).toBe('markdown'))
  it('excalidraw for .excalidraw', () => expect(inferFileType('/Brain/draw.excalidraw')).toBe('excalidraw'))
  it('null for .txt', () => expect(inferFileType('/Brain/doc.txt')).toBeNull())
})

describe('buildNewFilePath', () => {
  it('joins rootFolder and filename', () => {
    expect(buildNewFilePath('/Brain', 'note.md')).toBe('/Brain/note.md')
  })
})
