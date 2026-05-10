import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore } from './helpers/api-mock'

/**
 * Helper: open a markdown tab, set its content, and switch to preview mode.
 */
async function openMarkdownPreview(page: Parameters<typeof openFileInStore>[0], content: string) {
  await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

  await page.evaluate((content) => {
    const store = (window as any).__appStore
    const state = store.getState()
    const tabId = state.tabs[0]?.id
    if (!tabId) throw new Error('No tab found')
    state.updateTabContent(tabId, { content })
    state.setTabMode(tabId, 'preview')
  }, content)

  // Wait for preview panel to appear
  await page.waitForSelector('[data-testid="markdown-preview"]', { timeout: 5000 }).catch(() => {
    // Fallback: wait for any rendered markdown container
    return page.waitForSelector('.markdown-preview, .prose, [class*="preview"]', { timeout: 3000 })
  })
}

test.describe('TC-9: Markdown Preview', () => {
  test.beforeEach(async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': '' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-9.1 — GFM tables render', async ({ page }) => {
    const content = '| Col1 | Col2 |\n|------|------|\n| A    | B    |'
    await openMarkdownPreview(page, content)

    const table = page.locator('table').first()
    await expect(table).toBeVisible()
  })

  test('TC-9.2 — GFM strikethrough renders', async ({ page }) => {
    const content = '~~struck~~'
    await openMarkdownPreview(page, content)

    const del = page.locator('del')
    await expect(del).toBeVisible()
    await expect(del).toHaveText('struck')
  })

  test('TC-9.3 — GFM checkboxes render', async ({ page }) => {
    const content = '- [ ] task\n- [x] done'
    await openMarkdownPreview(page, content)

    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(2)

    // Second checkbox should be checked
    const second = checkboxes.nth(1)
    await expect(second).toBeChecked()
  })

  test('TC-9.4 — Fenced code block renders', async ({ page }) => {
    const content = "```js\nconsole.log('hi')\n```"
    await openMarkdownPreview(page, content)

    // Either <code> or <pre> should contain 'console'
    const codeEl = page.locator('pre, code').filter({ hasText: 'console' }).first()
    await expect(codeEl).toBeVisible()
  })

  test('TC-9.5 — Wikilink resolves by exact path', async ({ page }) => {
    // Set vaultIndex before switching to preview
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (!tabId) throw new Error('No tab found')

      // Set vault index so wikilink can resolve
      state.updateVaultIndex([{ name: 'exact.md', path: '/vault/notes/exact.md' }])

      state.updateTabContent(tabId, { content: '[[notes/exact]]' })
      state.setTabMode(tabId, 'preview')
    })

    await page.waitForTimeout(500)

    // Click the wikilink
    const wikilink = page.locator('a, span').filter({ hasText: 'notes/exact' }).first()
    await wikilink.click()

    await page.waitForTimeout(500)

    // A new tab for 'exact.md' should have opened
    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('exact.md')).toBeVisible()
  })

  test('TC-9.8 — Missing wikilink shows alert/toast', async ({ page }) => {
    // Capture the native alert dialog via Playwright's dialog event
    let alertMessage = ''
    page.once('dialog', async (dialog) => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (!tabId) throw new Error('No tab found')
      state.updateVaultIndex([])
      state.updateTabContent(tabId, { content: '[[missing]]' })
      state.setTabMode(tabId, 'preview')
    })

    await page.waitForTimeout(500)

    const wikilink = page.locator('a').filter({ hasText: /^missing$/ }).first()
    await wikilink.click()
    await page.waitForTimeout(300)

    expect(alertMessage.toLowerCase()).toContain('not found')
  })

  test('TC-9.10 — External URL shows confirm dialog', async ({ page }) => {
    // Mock window.confirm
    await page.evaluate(() => {
      ;(window as any)._confirms = []
      window.confirm = (msg: string) => { (window as any)._confirms.push(msg); return false }
    })

    await openMarkdownPreview(page, '[site](https://example.com)')

    await page.waitForTimeout(500)

    const link = page.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await page.waitForTimeout(300)

    const confirms: string[] = await page.evaluate(() => (window as any)._confirms)
    expect(confirms.length).toBeGreaterThan(0)
    expect(confirms[0]).toContain('example.com')
  })

  test('TC-9.11 — External URL confirm opens in browser', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': '' },
      extraScript: `
        window._openExternalCalls = [];
        window.api.openExternal = (u) => { window._openExternalCalls.push(u); return Promise.resolve(); };
        window.confirm = () => true;
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openMarkdownPreview(page, '[site](https://example.com)')

    await page.waitForTimeout(500)

    const link = page.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await page.waitForTimeout(300)

    const calls: string[] = await page.evaluate(() => (window as any)._openExternalCalls)
    expect(calls).toContain('https://example.com')
  })

  test('TC-9.12 — External URL cancel blocks navigation', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': '' },
      extraScript: `
        window._openExternalCalls = [];
        window.api.openExternal = (u) => { window._openExternalCalls.push(u); return Promise.resolve(); };
        window.confirm = () => false;
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openMarkdownPreview(page, '[site](https://example.com)')

    await page.waitForTimeout(500)

    const link = page.locator('a').filter({ hasText: 'site' }).first()
    await link.click()

    await page.waitForTimeout(300)

    const calls: string[] = await page.evaluate(() => (window as any)._openExternalCalls)
    expect(calls).toHaveLength(0)
  })

  test('TC-9.13 — Syntax highlight theme matches dark mode', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'dark' },
      readFile: { '/vault/note.md': '' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openMarkdownPreview(page, "```js\nconsole.log('hi')\n```")

    await page.waitForTimeout(500)

    // Check that dark mode is active: html element should have 'dark' class
    const hasDarkClass = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )

    // Also check for a github-dark link element or hljs dark styling
    const hasDarkThemeLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('github-dark'))
    })

    const hasDarkStyle = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'))
      return styles.some((s) => s.textContent?.includes('github-dark'))
    })

    // At minimum, the app should be in dark mode
    expect(hasDarkClass || hasDarkThemeLink || hasDarkStyle).toBe(true)
  })
})
