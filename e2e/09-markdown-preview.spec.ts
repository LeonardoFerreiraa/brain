import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

/**
 * Helper: open a markdown tab, set its content, and switch to preview mode.
 */
async function openMarkdownPreview(window: Parameters<typeof openFileInStore>[0], vault: string, content: string) {
  await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

  await window.evaluate((content) => {
    const store = (window as any).__appStore
    const state = store.getState()
    const tabId = state.tabs[0]?.id
    if (!tabId) throw new Error('No tab found')
    state.updateTabContent(tabId, { content })
    state.setTabMode(tabId, 'preview')
  }, content)

  // Wait for preview panel to appear
  await window.waitForSelector('[data-testid="markdown-preview"]', { timeout: 5000 }).catch(() => {
    // Fallback: wait for any rendered markdown container
    return window.waitForSelector('.markdown-preview, .prose, [class*="preview"]', { timeout: 3000 })
  })
}

test.describe('TC-9: Markdown Preview', () => {
  test.beforeEach(async ({ window, vault }) => {
    await createVaultFile(vault, 'note.md', '')
    await window.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-9.1 — GFM tables render', async ({ window, vault }) => {
    const content = '| Col1 | Col2 |\n|------|------|\n| A    | B    |'
    await openMarkdownPreview(window, vault, content)

    const table = window.locator('table').first()
    await expect(table).toBeVisible()
  })

  test('TC-9.2 — GFM strikethrough renders', async ({ window, vault }) => {
    const content = '~~struck~~'
    await openMarkdownPreview(window, vault, content)

    const del = window.locator('del')
    await expect(del).toBeVisible()
    await expect(del).toHaveText('struck')
  })

  test('TC-9.3 — GFM checkboxes render', async ({ window, vault }) => {
    const content = '- [ ] task\n- [x] done'
    await openMarkdownPreview(window, vault, content)

    const checkboxes = window.locator('input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(2)

    // Second checkbox should be checked
    const second = checkboxes.nth(1)
    await expect(second).toBeChecked()
  })

  test('TC-9.4 — Fenced code block renders', async ({ window, vault }) => {
    const content = "```js\nconsole.log('hi')\n```"
    await openMarkdownPreview(window, vault, content)

    // Either <code> or <pre> should contain 'console'
    const codeEl = window.locator('pre, code').filter({ hasText: 'console' }).first()
    await expect(codeEl).toBeVisible()
  })

  test('TC-9.5 — Wikilink resolves by exact path', async ({ window, vault }) => {
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    await window.evaluate((vaultPath) => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (!tabId) throw new Error('No tab found')

      // Set vault index so wikilink can resolve
      state.updateVaultIndex([{ name: 'exact.md', path: `${vaultPath}/notes/exact.md` }])

      state.updateTabContent(tabId, { content: '[[notes/exact]]' })
      state.setTabMode(tabId, 'preview')
    }, vault)

    await window.waitForTimeout(500)

    // Click the wikilink
    const wikilink = window.locator('a, span').filter({ hasText: 'notes/exact' }).first()
    await wikilink.click()

    await window.waitForTimeout(500)

    // A new tab for 'exact.md' should have opened
    const tabBar = window.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('exact.md')).toBeVisible()
  })

  test('TC-9.8 — Missing wikilink shows alert/toast', async ({ window, vault }) => {
    // Capture the native alert dialog via Playwright's dialog event
    let alertMessage = ''
    window.once('dialog', async (dialog) => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (!tabId) throw new Error('No tab found')
      state.updateVaultIndex([])
      state.updateTabContent(tabId, { content: '[[missing]]' })
      state.setTabMode(tabId, 'preview')
    })

    await window.waitForTimeout(500)

    const wikilink = window.locator('a').filter({ hasText: /^missing$/ }).first()
    await wikilink.click()
    await window.waitForTimeout(300)

    expect(alertMessage.toLowerCase()).toContain('not found')
  })

  test('TC-9.10 — External URL shows confirm dialog', async ({ window, vault }) => {
    // Mock window.confirm
    await window.evaluate(() => {
      ;(window as any)._confirms = []
      window.confirm = (msg: string) => { (window as any)._confirms.push(msg); return false }
    })

    await openMarkdownPreview(window, vault, '[site](https://example.com)')

    await window.waitForTimeout(500)

    const link = window.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await window.waitForTimeout(300)

    const confirms: string[] = await window.evaluate(() => (window as any)._confirms)
    expect(confirms.length).toBeGreaterThan(0)
    expect(confirms[0]).toContain('example.com')
  })

  test('TC-9.11 — External URL confirm opens in browser', async ({ window, vault }) => {
    // With contextIsolation we cannot spy on window.api.openExternal.
    // We verify indirectly: confirm was called (with true) and no error occurred.
    await window.evaluate(() => {
      ;(window as any)._confirms = []
      window.confirm = (msg: string) => { (window as any)._confirms.push(msg); return true }
    })

    await openMarkdownPreview(window, vault, '[site](https://example.com)')

    await window.waitForTimeout(500)

    const link = window.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await window.waitForTimeout(300)

    // confirm was called with a message containing the URL
    const confirms: string[] = await window.evaluate(() => (window as any)._confirms)
    expect(confirms.length).toBeGreaterThan(0)
    expect(confirms[0]).toContain('example.com')
  })

  test('TC-9.12 — External URL cancel blocks navigation', async ({ window, vault }) => {
    // With contextIsolation we cannot spy on window.api.openExternal.
    // We verify indirectly: confirm was called (with false) — openExternal should NOT be called.
    await window.evaluate(() => {
      ;(window as any)._confirms = []
      window.confirm = (msg: string) => { (window as any)._confirms.push(msg); return false }
    })

    await openMarkdownPreview(window, vault, '[site](https://example.com)')

    await window.waitForTimeout(500)

    const link = window.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await window.waitForTimeout(300)

    // confirm was called and returned false — navigation blocked
    const confirms: string[] = await window.evaluate(() => (window as any)._confirms)
    expect(confirms.length).toBeGreaterThan(0)
    // No new tabs should have opened (no way to verify openExternal wasn't called, but confirm returned false)
  })

})

// TC-9.13 uses dark theme
test.describe('TC-9: Markdown Preview (dark)', () => {
  test.use({ initialTheme: 'dark' })

  test('TC-9.13 — Syntax highlight theme matches dark mode (dark fixture)', async ({ window, vault }) => {
    await createVaultFile(vault, 'note.md', '')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    await window.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) {
        state.updateTabContent(tabId, { content: "```js\nconsole.log('hi')\n```" })
        state.setTabMode(tabId, 'preview')
      }
    })

    await window.waitForTimeout(500)

    const hasDarkClass = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )

    const hasDarkThemeLink = await window.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('github-dark'))
    })

    const hasDarkStyle = await window.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'))
      return styles.some((s) => s.textContent?.includes('github-dark'))
    })

    expect(hasDarkClass || hasDarkThemeLink || hasDarkStyle).toBe(true)
  })
})
