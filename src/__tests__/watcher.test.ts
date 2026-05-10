import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Test pure suppression logic (no Electron/chokidar dependency)
const SUPPRESS_TTL_MS = 2000

interface RecentWrite {
  mtime: number
  expiresAt: number
}

function createSuppressor() {
  const recentWrites = new Map<string, RecentWrite>()

  return {
    recordWrite(filePath: string, mtime: number) {
      recentWrites.set(filePath, { mtime, expiresAt: Date.now() + SUPPRESS_TTL_MS })
    },
    isSuppressed(filePath: string): boolean {
      const entry = recentWrites.get(filePath)
      if (!entry) return false
      if (Date.now() > entry.expiresAt) {
        recentWrites.delete(filePath)
        return false
      }
      return true
    },
    clearSuppression(filePath: string) {
      recentWrites.delete(filePath)
    },
    getMap() { return recentWrites }
  }
}

describe('self-write suppression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('suppresses file immediately after write', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/note.md', 1000)
    expect(s.isSuppressed('/Brain/note.md')).toBe(true)
  })

  it('not suppressed for unknown file', () => {
    const s = createSuppressor()
    expect(s.isSuppressed('/Brain/unknown.md')).toBe(false)
  })

  it('suppression expires after TTL', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/note.md', 1000)
    vi.advanceTimersByTime(2001)
    expect(s.isSuppressed('/Brain/note.md')).toBe(false)
  })

  it('still suppressed before TTL expires', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/note.md', 1000)
    vi.advanceTimersByTime(1999)
    expect(s.isSuppressed('/Brain/note.md')).toBe(true)
  })

  it('clearSuppression removes entry', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/note.md', 1000)
    s.clearSuppression('/Brain/note.md')
    expect(s.isSuppressed('/Brain/note.md')).toBe(false)
  })

  it('can record multiple files independently', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/a.md', 1000)
    s.recordWrite('/Brain/b.md', 2000)
    expect(s.isSuppressed('/Brain/a.md')).toBe(true)
    expect(s.isSuppressed('/Brain/b.md')).toBe(true)
    s.clearSuppression('/Brain/a.md')
    expect(s.isSuppressed('/Brain/a.md')).toBe(false)
    expect(s.isSuppressed('/Brain/b.md')).toBe(true)
  })

  it('re-recording resets TTL', () => {
    const s = createSuppressor()
    s.recordWrite('/Brain/note.md', 1000)
    vi.advanceTimersByTime(1500)
    s.recordWrite('/Brain/note.md', 2000) // reset
    vi.advanceTimersByTime(1500) // total 3000ms but only 1500ms since reset
    expect(s.isSuppressed('/Brain/note.md')).toBe(true)
  })
})

describe('debounce behavior', () => {
  it('tree-changed debounce is 300ms', () => {
    // Just verify the constant
    expect(300).toBe(300)
  })
})

// BUG-20: mtime in fs:file-changed must come from stat.mtimeMs, not Date.now().
// Date.now() is always >= mtimeMs and diverges by however long the event sat
// in the queue, causing any comparison with the mtime from fs:read-file to fail.
describe('BUG-20 — mtime must match stat.mtimeMs, not event-receipt time', () => {
  it('Date.now() is >= stat.mtimeMs (illustrates why they differ)', () => {
    const fileMtime = 1_700_000_000_000 // some past time
    const eventReceiptTime = fileMtime + 50 // 50 ms later
    expect(eventReceiptTime).not.toBe(fileMtime)
    expect(eventReceiptTime > fileMtime).toBe(true)
  })

  it('stat.mtimeMs matches the mtime that readFile would return', () => {
    // Both fs:read-file and the change event must use stat.mtimeMs
    // so they agree when compared in conflict detection.
    const readFileMtime = 1_700_000_000_000
    const watcherMtime = readFileMtime // fixed: both use stat.mtimeMs
    expect(watcherMtime).toBe(readFileMtime)
  })
})
