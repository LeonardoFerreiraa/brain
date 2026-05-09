import { describe, it, expect } from 'vitest'
import { preprocessWikilinks, resolveWikilink, isExternalUrl, isWikilinkHref } from '../renderer/components/MarkdownPreview'

describe('preprocessWikilinks', () => {
  it('converts [[name]] to markdown link', () => {
    const result = preprocessWikilinks('See [[note]]')
    expect(result).toContain('[note](wikilink:note)')
  })

  it('handles [[name|alias]] with alias', () => {
    const result = preprocessWikilinks('See [[note.md|My Note]]')
    expect(result).toContain('[My Note](wikilink:note.md)')
  })

  it('leaves non-wikilink text unchanged', () => {
    const result = preprocessWikilinks('Hello world')
    expect(result).toBe('Hello world')
  })

  it('encodes special chars in href', () => {
    const result = preprocessWikilinks('[[my note]]')
    expect(result).toContain('wikilink:my%20note')
  })

  it('handles multiple wikilinks', () => {
    const result = preprocessWikilinks('[[a]] and [[b]]')
    expect(result).toContain('[a](wikilink:a)')
    expect(result).toContain('[b](wikilink:b)')
  })
})

describe('resolveWikilink', () => {
  const index = new Map([
    ['note.md', '/Brain/note.md'],
    ['draw.excalidraw', '/Brain/draw.excalidraw'],
    ['sub/nested.md', '/Brain/sub/nested.md'],
  ])

  it('resolves exact basename match', () => {
    const result = resolveWikilink('note.md', index)
    expect(result?.path).toBe('/Brain/note.md')
    expect(result?.ambiguous).toBe(false)
  })

  it('returns null for unknown name', () => {
    expect(resolveWikilink('unknown.md', index)).toBeNull()
  })

  it('resolves excalidraw wikilink', () => {
    const result = resolveWikilink('draw.excalidraw', index)
    expect(result?.path).toBe('/Brain/draw.excalidraw')
  })
})

describe('isExternalUrl', () => {
  it('true for https', () => expect(isExternalUrl('https://example.com')).toBe(true))
  it('true for http', () => expect(isExternalUrl('http://example.com')).toBe(true))
  it('false for wikilink', () => expect(isExternalUrl('wikilink:note')).toBe(false))
  it('false for relative', () => expect(isExternalUrl('./note.md')).toBe(false))
})

describe('isWikilinkHref', () => {
  it('true for wikilink:', () => expect(isWikilinkHref('wikilink:note')).toBe(true))
  it('false for https', () => expect(isWikilinkHref('https://example.com')).toBe(false))
  it('false for empty', () => expect(isWikilinkHref('')).toBe(false))
})
