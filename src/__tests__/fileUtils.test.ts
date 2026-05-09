import { describe, it, expect } from 'vitest'
import { getFileExtension, isSupported } from '../utils/fileUtils'

describe('getFileExtension', () => {
  it('returns extension for .md files', () => {
    expect(getFileExtension('note.md')).toBe('.md')
  })
  it('returns extension for .excalidraw files', () => {
    expect(getFileExtension('draw.excalidraw')).toBe('.excalidraw')
  })
  it('returns empty string for no extension', () => {
    expect(getFileExtension('noext')).toBe('')
  })
})

describe('isSupported', () => {
  it('returns true for .md', () => {
    expect(isSupported('note.md')).toBe(true)
  })
  it('returns true for .excalidraw', () => {
    expect(isSupported('draw.excalidraw')).toBe(true)
  })
  it('returns false for .txt', () => {
    expect(isSupported('doc.txt')).toBe(false)
  })
})
