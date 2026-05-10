import { describe, it, expect } from 'vitest'
import { isUnderRoot, atomicTmpPath } from '../utils/pathUtils'

// Test the path traversal detection logic (pure function version)
describe('path traversal detection', () => {
  const root = '/home/user/Brain'

  it('allows path directly under root', () => {
    expect(isUnderRoot('/home/user/Brain/note.md', root)).toBe(true)
  })

  it('allows root itself', () => {
    expect(isUnderRoot('/home/user/Brain', root)).toBe(true)
  })

  it('rejects path traversal above root', () => {
    expect(isUnderRoot('/home/user/secrets.txt', root)).toBe(false)
  })

  it('rejects path outside root', () => {
    expect(isUnderRoot('/etc/passwd', root)).toBe(false)
  })

  it('rejects root sibling', () => {
    expect(isUnderRoot('/home/user/Brain2/note.md', root)).toBe(false)
  })

  it('rejects partial root name match', () => {
    expect(isUnderRoot('/home/user/BrainExtension/file.md', root)).toBe(false)
  })
})

// Test atomic write path naming
describe('atomic write temp path', () => {
  it('appends .tmp to file path', () => {
    const filePath = '/home/user/Brain/note.md'
    const tmpPath = atomicTmpPath(filePath)
    expect(tmpPath).toBe('/home/user/Brain/note.md.tmp')
    expect(tmpPath.endsWith('.tmp')).toBe(true)
  })

  // BUG-02: tmp path must be in same dir as target so cleanup is unambiguous
  it('tmp path is in same directory as target', () => {
    const filePath = '/home/user/Brain/sub/note.md'
    const tmpPath = atomicTmpPath(filePath)
    const targetDir = filePath.substring(0, filePath.lastIndexOf('/'))
    const tmpDir = tmpPath.substring(0, tmpPath.lastIndexOf('/'))
    expect(tmpDir).toBe(targetDir)
  })
})
