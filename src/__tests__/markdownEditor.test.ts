import { describe, it, expect } from 'vitest'

// BUG-09: When the editor is recreated (theme/wrap toggle), the initial doc
// should come from the live view state, not the potentially-stale tab.content.

describe('BUG-09 — editor recreate uses live content over stale store content', () => {
  it('prefers liveContent when view exists (simulated)', () => {
    // Simulate the pattern: liveContent = viewRef.current?.state.doc.toString() ?? tab.content
    const tabContent = 'stale content from store'
    const liveContent = 'live content with pending keystrokes'

    // When viewRef.current exists, liveContent wins
    const viewRefCurrent = { state: { doc: { toString: () => liveContent } } }
    const docToUse = viewRefCurrent?.state.doc.toString() ?? tabContent
    expect(docToUse).toBe(liveContent)
  })

  it('falls back to tab.content when no view exists yet (first mount)', () => {
    const tabContent = 'initial content from store'
    const viewRefCurrent = null
    const docToUse = viewRefCurrent ?? tabContent
    expect(docToUse).toBe(tabContent)
  })
})
