import { describe, it, expect } from 'vitest'
import { getWordCount, getLineCount, extractTitle, isMarkdownEmpty } from '../utils/markdownUtils'

describe('getWordCount', () => {
  it('counts words', () => expect(getWordCount('hello world')).toBe(2))
  it('returns 0 for empty', () => expect(getWordCount('')).toBe(0))
  it('returns 0 for whitespace only', () => expect(getWordCount('   ')).toBe(0))
  it('handles multiple spaces', () => expect(getWordCount('a  b  c')).toBe(3))
  it('counts single word', () => expect(getWordCount('hello')).toBe(1))
})

describe('getLineCount', () => {
  it('counts lines', () => expect(getLineCount('a\nb\nc')).toBe(3))
  it('single line', () => expect(getLineCount('hello')).toBe(1))
  it('empty string is 1 line', () => expect(getLineCount('')).toBe(1))
  it('trailing newline', () => expect(getLineCount('a\n')).toBe(2))
})

describe('extractTitle', () => {
  it('extracts h1 title', () => expect(extractTitle('# My Title\n\ncontent')).toBe('My Title'))
  it('returns null if no h1', () => expect(extractTitle('## Sub\ncontent')).toBeNull())
  it('returns null for empty', () => expect(extractTitle('')).toBeNull())
  it('handles title with spaces', () => expect(extractTitle('# Hello World')).toBe('Hello World'))
})

describe('isMarkdownEmpty', () => {
  it('true for empty', () => expect(isMarkdownEmpty('')).toBe(true))
  it('true for whitespace', () => expect(isMarkdownEmpty('   \n  ')).toBe(true))
  it('false for content', () => expect(isMarkdownEmpty('# Title')).toBe(false))
})
