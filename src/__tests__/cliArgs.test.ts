import { describe, it, expect } from 'vitest'
import { extractFilePathArg, isSupportedFilePath } from '../utils/cliArgs'

describe('extractFilePathArg', () => {
  it('finds .md file in argv', () => {
    expect(extractFilePathArg(['electron', '.', '/Brain/note.md'])).toBe('/Brain/note.md')
  })

  it('finds .excalidraw file in argv', () => {
    expect(extractFilePathArg(['electron', '.', '/Brain/draw.excalidraw'])).toBe('/Brain/draw.excalidraw')
  })

  it('returns null when no file found', () => {
    expect(extractFilePathArg(['electron', '.', '--flag'])).toBeNull()
  })

  it('returns first matching file', () => {
    const result = extractFilePathArg(['/Brain/a.md', '/Brain/b.md'])
    expect(result).toBe('/Brain/a.md')
  })

  it('ignores non-file args', () => {
    expect(extractFilePathArg(['--no-sandbox', '--disable-gpu'])).toBeNull()
  })

  it('handles empty argv', () => {
    expect(extractFilePathArg([])).toBeNull()
  })
})

describe('isSupportedFilePath', () => {
  it('true for .md', () => expect(isSupportedFilePath('note.md')).toBe(true))
  it('true for .excalidraw', () => expect(isSupportedFilePath('draw.excalidraw')).toBe(true))
  it('false for .txt', () => expect(isSupportedFilePath('doc.txt')).toBe(false))
  it('false for .js', () => expect(isSupportedFilePath('app.js')).toBe(false))
  it('false for empty', () => expect(isSupportedFilePath('')).toBe(false))
})
