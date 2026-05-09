import { describe, it, expect } from 'vitest'
import {
  parseExcalidrawFile,
  serializeExcalidrawFile,
  KNOWN_EXCALIDRAW_VERSION,
  type ExcalidrawFileData,
} from '../renderer/components/Canvas'
import type { ExcalidrawTab } from '../renderer/store/useAppStore'

describe('parseExcalidrawFile', () => {
  it('parses valid excalidraw file', () => {
    const content = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      elements: [],
      appState: { viewBackgroundColor: '#fff' },
      files: {},
    })
    const result = parseExcalidrawFile(content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('excalidraw')
      expect(result.data.elements).toEqual([])
    }
  })

  it('rejects invalid JSON', () => {
    const result = parseExcalidrawFile('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid JSON')
  })

  it('rejects wrong type field', () => {
    const result = parseExcalidrawFile(JSON.stringify({ type: 'markdown', version: 2, elements: [] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Not an Excalidraw file')
  })

  it('parses file with newer version (still ok, caller checks version)', () => {
    const content = JSON.stringify({
      type: 'excalidraw',
      version: KNOWN_EXCALIDRAW_VERSION + 1,
      elements: [],
      appState: {},
    })
    const result = parseExcalidrawFile(content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.version).toBeGreaterThan(KNOWN_EXCALIDRAW_VERSION)
    }
  })

  it('extracts passthrough unknown fields', () => {
    const content = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      elements: [],
      appState: {},
      customField: 'preserved',
    })
    const result = parseExcalidrawFile(content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.passthrough['customField']).toBe('preserved')
    }
  })

  it('passthrough excludes known fields', () => {
    const content = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      elements: [],
      appState: {},
      files: {},
    })
    const result = parseExcalidrawFile(content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.passthrough)).toHaveLength(0)
    }
  })
})

describe('serializeExcalidrawFile', () => {
  const mockTab: ExcalidrawTab = {
    id: 'test-id',
    type: 'excalidraw',
    filePath: '/Brain/draw.excalidraw',
    fileName: 'draw.excalidraw',
    dirty: false,
    elements: [{ id: 'el1', type: 'rectangle' }],
    appState: { viewBackgroundColor: '#fff' },
    files: {},
    _passthrough: { customKey: 'customValue' },
  }

  it('serializes to valid JSON', () => {
    const result = serializeExcalidrawFile(mockTab)
    const parsed = JSON.parse(result) as ExcalidrawFileData
    expect(parsed.type).toBe('excalidraw')
    expect(parsed.version).toBe(KNOWN_EXCALIDRAW_VERSION)
    expect(parsed.source).toBe('brain')
  })

  it('preserves passthrough fields', () => {
    const result = serializeExcalidrawFile(mockTab)
    const parsed = JSON.parse(result) as Record<string, unknown>
    expect(parsed['customKey']).toBe('customValue')
  })

  it('includes elements and appState', () => {
    const result = serializeExcalidrawFile(mockTab)
    const parsed = JSON.parse(result) as ExcalidrawFileData
    expect(parsed.elements).toHaveLength(1)
    expect(parsed.appState).toEqual({ viewBackgroundColor: '#fff' })
  })

  it('includes files field', () => {
    const result = serializeExcalidrawFile(mockTab)
    const parsed = JSON.parse(result) as ExcalidrawFileData
    expect(parsed.files).toEqual({})
  })
})
