import { describe, it, expect } from 'vitest'
import { inferTabType, checkTabCap, TAB_SOFT_CAP, TAB_HARD_CAP } from '../utils/tabUtils'

describe('inferTabType', () => {
  it('infers markdown from .md', () => {
    expect(inferTabType('/Brain/note.md')).toBe('markdown')
  })
  it('infers excalidraw from .excalidraw', () => {
    expect(inferTabType('/Brain/draw.excalidraw')).toBe('excalidraw')
  })
  it('returns null for unsupported', () => {
    expect(inferTabType('/Brain/file.txt')).toBeNull()
  })
  it('returns null for no extension', () => {
    expect(inferTabType('/Brain/file')).toBeNull()
  })
})

describe('checkTabCap', () => {
  it('ok below soft cap', () => {
    expect(checkTabCap(0)).toBe('ok')
    expect(checkTabCap(19)).toBe('ok')
  })
  it('soft at soft cap', () => {
    expect(checkTabCap(TAB_SOFT_CAP)).toBe('soft')
    expect(checkTabCap(25)).toBe('soft')
  })
  it('hard at hard cap', () => {
    expect(checkTabCap(TAB_HARD_CAP)).toBe('hard')
    expect(checkTabCap(100)).toBe('hard')
  })
  it('soft cap is 20', () => {
    expect(TAB_SOFT_CAP).toBe(20)
  })
  it('hard cap is 50', () => {
    expect(TAB_HARD_CAP).toBe(50)
  })
})
