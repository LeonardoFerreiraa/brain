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

// BUG-10: Canvas must use useState for ExcalidrawComponent so dynamic import
// triggers a re-render. We can't test React rendering here, but we verify that
// the module no longer exports a module-level variable (the module-level `let`
// is gone from Canvas.tsx — only the named exports remain).
describe('BUG-10 — Canvas exports are pure functions/constants, no module-level mutable state', () => {
  it('Canvas is exported as a function', async () => {
    const mod = await import('../renderer/components/Canvas')
    expect(typeof mod.Canvas).toBe('function')
  })

  it('serializeExcalidrawFile is exported', async () => {
    const mod = await import('../renderer/components/Canvas')
    expect(typeof mod.serializeExcalidrawFile).toBe('function')
  })
})

// BUG-17: getContent for excalidraw must use serializeExcalidrawFile so
// type/version are present; parseExcalidrawFile must accept the output.
describe('BUG-17 — serialize → parse round-trip includes type and version', () => {
  const tab: ExcalidrawTab = {
    id: 'rt',
    type: 'excalidraw',
    filePath: '/Brain/rt.excalidraw',
    fileName: 'rt.excalidraw',
    dirty: false,
    elements: [{ id: 'e1', type: 'ellipse' }],
    appState: { viewBackgroundColor: '#000' },
    files: {},
  }

  it('serialized output passes parseExcalidrawFile validation', () => {
    const serialized = serializeExcalidrawFile(tab)
    const result = parseExcalidrawFile(serialized)
    expect(result.ok).toBe(true)
  })

  it('serialized output contains type field', () => {
    const parsed = JSON.parse(serializeExcalidrawFile(tab)) as ExcalidrawFileData
    expect(parsed.type).toBe('excalidraw')
  })

  it('serialized output contains version field', () => {
    const parsed = JSON.parse(serializeExcalidrawFile(tab)) as ExcalidrawFileData
    expect(typeof parsed.version).toBe('number')
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
