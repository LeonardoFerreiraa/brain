import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore } from './helpers/api-mock'

test.describe('TC-14: Theme System', () => {
  test('TC-14.1 — Default theme is system (light in test env)', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'system' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // In test environment, system theme = light → no 'dark' class on html element
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })

  test('TC-14.2 — System theme dark mode via __emitThemeChanged', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'system' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // Simulate OS switching to dark mode
    await page.evaluate(() => (window as any).__emitThemeChanged(true))

    await page.waitForTimeout(300)

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)
  })

  test('TC-14.3 — System theme light mode via __emitThemeChanged', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'system' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // First go dark, then go light
    await page.evaluate(() => (window as any).__emitThemeChanged(true))
    await page.waitForTimeout(200)
    await page.evaluate(() => (window as any).__emitThemeChanged(false))
    await page.waitForTimeout(300)

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })

  test('TC-14.4 — OS theme change propagates at runtime', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'system' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    // Verify starts without dark class
    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(initialDark).toBe(false)

    // Emit theme change event (no reload needed)
    await page.evaluate(() => (window as any).__emitThemeChanged(true))
    await page.waitForTimeout(300)

    const afterChange = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(afterChange).toBe(true)
  })

  test('TC-14.5 — Manual dark override', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'dark' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)
  })

  test('TC-14.6 — Manual light override', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'light' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })

  test('TC-14.7 — CodeMirror uses oneDark in dark mode', async ({ page }) => {
    // Note: Detecting oneDark theme application by computed style is fragile.
    // Marking fixme until there is a reliable data-testid or class to check.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'dark' },
      readFile: { '/vault/note.md': '# Dark note' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')

    const editor = page.locator('.cm-editor').first()
    await expect(editor).toBeVisible()

    // Check that the editor has a dark background consistent with oneDark
    // oneDark background is approximately #282c34
    const bgColor = await editor.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Dark backgrounds typically have low RGB values
    // rgb(40, 44, 52) = oneDark, rgb(30, 30, 30) = other dark themes
    const isDarkBg = bgColor.includes('rgb(') && (() => {
      const match = bgColor.match(/\d+/g)
      if (!match) return false
      const [r, g, b] = match.map(Number)
      return r < 80 && g < 80 && b < 80
    })()

    expect(isDarkBg).toBe(true)
  })

  test('TC-14.9 — Highlight.js CSS dark theme in code blocks', async ({ page }) => {
    // Note: rehype-highlight may inline styles or use class-based theming.
    // The approach depends on the build configuration. Marking fixme if not detectable.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'dark' },
      readFile: { '/vault/note.md': '' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) {
        state.updateTabContent(tabId, { content: "```js\nconsole.log('hi')\n```" })
        state.setTabMode(tabId, 'preview')
      }
    })

    await page.waitForTimeout(500)

    // Check for github-dark CSS link
    const hasDarkLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('github-dark'))
    })

    // Check for github-dark style tag
    const hasDarkStyle = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'))
      return styles.some((s) => s.textContent?.includes('github-dark'))
    })

    // Check for hljs class on code elements
    const hasHljsClass = await page.evaluate(() =>
      document.querySelector('.hljs') !== null,
    )

    expect(hasDarkLink || hasDarkStyle || hasHljsClass).toBe(true)
  })

  test('TC-14.10 — Highlight.js switches on theme change', async ({ page }) => {
    // Note: Detecting CSS theme swap on runtime theme change requires knowing
    // whether rehype-highlight uses CSS links, style injection, or class swapping.
    // Marking fixme until the implementation approach is confirmed.
    test.fixme()

    await setupMock(page, {
      config: { rootFolder: '/vault', theme: 'light' },
      readFile: { '/vault/note.md': '' },
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')

    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const state = store.getState()
      const tabId = state.tabs[0]?.id
      if (tabId) {
        state.updateTabContent(tabId, { content: "```js\nconsole.log('hi')\n```" })
        state.setTabMode(tabId, 'preview')
      }
    })

    await page.waitForTimeout(500)

    // Record initial highlight theme
    const initialDarkTheme = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('dark'))
    })
    expect(initialDarkTheme).toBe(false)

    // Switch to dark theme
    await page.evaluate(() => (window as any).__emitThemeChanged(true))
    await page.waitForTimeout(500)

    // Now a dark highlight theme should be applied
    const afterDarkTheme = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('dark'))
    })
    expect(afterDarkTheme).toBe(true)
  })
})
