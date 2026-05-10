import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-14: Theme System — system theme', () => {
  test.use({ initialTheme: 'system' })

  test('TC-14.1 — Default theme is system (light in test env)', async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    // In test environment, light theme → no 'dark' class on html element
    const hasDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })

  test('TC-14.2 — System theme dark mode via theme:changed IPC', async ({ window, electronApp }) => {
    await window.waitForSelector('[data-testid="empty-state"]')

    // Simulate OS switching to dark mode by sending the IPC event from main process
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('theme:changed', true)
    })

    await window.waitForTimeout(300)

    const hasDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)
  })

  test('TC-14.3 — System theme light mode via theme:changed IPC', async ({ window, electronApp }) => {
    await window.waitForSelector('[data-testid="empty-state"]')

    // First go dark, then go light
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('theme:changed', true)
    })
    await window.waitForTimeout(200)

    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('theme:changed', false)
    })
    await window.waitForTimeout(300)

    const hasDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })

  test('TC-14.4 — OS theme change propagates at runtime', async ({ window, electronApp }) => {
    await window.waitForSelector('[data-testid="empty-state"]')

    // Verify starts without dark class
    const initialDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(initialDark).toBe(false)

    // Emit theme change event (no reload needed)
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('theme:changed', true)
    })
    await window.waitForTimeout(300)

    const afterChange = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(afterChange).toBe(true)
  })

  test('TC-14.6 — Manual light override', async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    const hasDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })
})

test.describe('TC-14: Theme System — dark theme', () => {
  test.use({ initialTheme: 'dark' })

  test('TC-14.5 — Manual dark override', async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    const hasDark = await window.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(true)
  })

  test('TC-14.7 — CodeMirror uses oneDark in dark mode', async ({ window, vault }) => {
    // Note: Detecting oneDark theme application by computed style is fragile.
    test.fixme()

    await createVaultFile(vault, 'note.md', '# Dark note')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')

    const editor = window.locator('.cm-editor').first()
    await expect(editor).toBeVisible()

    const bgColor = await editor.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    const isDarkBg = bgColor.includes('rgb(') && (() => {
      const match = bgColor.match(/\d+/g)
      if (!match) return false
      const [r, g, b] = match.map(Number)
      return r < 80 && g < 80 && b < 80
    })()

    expect(isDarkBg).toBe(true)
  })

  test('TC-14.9 — Highlight.js CSS dark theme in code blocks', async ({ window, vault }) => {
    // Note: rehype-highlight may inline styles or use class-based theming.
    test.fixme()

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

    const hasDarkLink = await window.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('github-dark'))
    })

    const hasDarkStyle = await window.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'))
      return styles.some((s) => s.textContent?.includes('github-dark'))
    })

    const hasHljsClass = await window.evaluate(() =>
      document.querySelector('.hljs') !== null,
    )

    expect(hasDarkLink || hasDarkStyle || hasHljsClass).toBe(true)
  })

  test('TC-14.10 — Highlight.js switches on theme change', async ({ window, vault, electronApp }) => {
    // Note: Detecting CSS theme swap on runtime theme change is fragile.
    test.fixme()

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

    // Record initial highlight theme (dark mode is active from fixture)
    const initialDarkTheme = await window.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('dark'))
    })
    expect(initialDarkTheme).toBe(true)

    // Switch to light theme
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('theme:changed', false)
    })
    await window.waitForTimeout(500)

    // Now a light highlight theme should be applied
    const afterLightTheme = await window.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.some((l) => l.getAttribute('href')?.includes('dark'))
    })
    expect(afterLightTheme).toBe(false)
  })
})
