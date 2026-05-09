import { describe, it, expect } from 'vitest'
import {
  computeContentHash,
  hashesMatch,
  filterExcalidrawAppState,
  computeExcalidrawHash,
  EXCALIDRAW_PERSISTED_KEYS,
} from '../utils/hashUtils'

describe('computeContentHash', () => {
  it('returns a string', () => {
    expect(typeof computeContentHash('hello')).toBe('string')
  })

  it('same content gives same hash', () => {
    expect(computeContentHash('hello')).toBe(computeContentHash('hello'))
  })

  it('different content gives different hash', () => {
    expect(computeContentHash('hello')).not.toBe(computeContentHash('world'))
  })

  it('empty string has a hash', () => {
    expect(computeContentHash('')).toBeTruthy()
  })

  it('hash changes with single char change', () => {
    expect(computeContentHash('abcd')).not.toBe(computeContentHash('abce'))
  })
})

describe('hashesMatch', () => {
  it('true for same hash', () => {
    const h = computeContentHash('test')
    expect(hashesMatch(h, h)).toBe(true)
  })

  it('false for different hash', () => {
    expect(hashesMatch(computeContentHash('a'), computeContentHash('b'))).toBe(false)
  })
})

describe('filterExcalidrawAppState', () => {
  it('keeps whitelisted keys', () => {
    const state = {
      viewBackgroundColor: '#fff',
      gridSize: null,
      zoom: 1.5, // ephemeral
      scrollX: 0, // ephemeral
    }
    const filtered = filterExcalidrawAppState(state as Record<string, unknown>)
    expect('viewBackgroundColor' in filtered).toBe(true)
    expect('gridSize' in filtered).toBe(true)
    expect('zoom' in filtered).toBe(false)
    expect('scrollX' in filtered).toBe(false)
  })

  it('excludes ephemeral fields', () => {
    const state = { cursorButton: 'move', collaborators: [], selectedElementIds: {} }
    const filtered = filterExcalidrawAppState(state as Record<string, unknown>)
    expect(Object.keys(filtered)).toHaveLength(0)
  })

  it('EXCALIDRAW_PERSISTED_KEYS has 7 entries', () => {
    expect(EXCALIDRAW_PERSISTED_KEYS).toHaveLength(7)
  })
})

describe('computeExcalidrawHash', () => {
  it('same data gives same hash', () => {
    const h1 = computeExcalidrawHash([], {}, {})
    const h2 = computeExcalidrawHash([], {}, {})
    expect(h1).toBe(h2)
  })

  it('ephemeral appState changes do not change hash', () => {
    const h1 = computeExcalidrawHash([], {}, { zoom: 1 })
    const h2 = computeExcalidrawHash([], {}, { zoom: 2 })
    expect(h1).toBe(h2)
  })

  it('element changes change hash', () => {
    const h1 = computeExcalidrawHash([], {}, {})
    const h2 = computeExcalidrawHash([{ id: 'el1' }], {}, {})
    expect(h1).not.toBe(h2)
  })

  it('persisted appState changes change hash', () => {
    const h1 = computeExcalidrawHash([], {}, { viewBackgroundColor: '#fff' })
    const h2 = computeExcalidrawHash([], {}, { viewBackgroundColor: '#000' })
    expect(h1).not.toBe(h2)
  })
})
