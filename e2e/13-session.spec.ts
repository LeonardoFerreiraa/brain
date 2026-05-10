import { test, expect } from '@playwright/test'
import { setupMock } from './helpers/api-mock'

test.describe('TC-13: Session Restore', () => {
  test('TC-13.1 — Open tabs restored on relaunch', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/note.md', '/vault/drawing.excalidraw'],
          activeTab: '/vault/note.md',
        },
      },
      readFile: {
        '/vault/note.md': '# Note',
        '/vault/drawing.excalidraw': JSON.stringify({ elements: [], appState: {} }),
      },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    // Both tabs should be present in the tab bar
    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })
    await expect(tabBar.getByText('drawing.excalidraw')).toBeVisible({ timeout: 5000 })
  })

  test('TC-13.2 — Active tab restored', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/note.md'],
          activeTab: '/vault/note.md',
        },
      },
      readFile: { '/vault/note.md': '# Note' },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    // The 'note.md' tab should be the active one (has border-blue-500 styling)
    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

    // Check that the tab has active styling (border-blue-500 or active class)
    const activeTab = tabBar.locator('[class*="border-blue-500"], [class*="active"], [aria-selected="true"]').first()
    await expect(activeTab).toBeVisible()
    await expect(activeTab).toContainText('note.md')
  })

  test('TC-13.3 — Missing file silently skipped', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/deleted.md', '/vault/note.md'],
          activeTab: '/vault/note.md',
        },
      },
      readFile: {
        // deleted.md is NOT in readFile map → readFile returns ok:false
        '/vault/note.md': '# Note',
      },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    const tabBar = page.locator('[data-testid="tab-bar"]')

    // note.md should be present
    await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

    // deleted.md should NOT appear
    await expect(tabBar.getByText('deleted.md')).not.toBeVisible()

    // No error toast / error message should appear
    await expect(page.getByText(/error/i)).not.toBeVisible()
  })

  test('TC-13.4 — Tab order preserved', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/a.md', '/vault/b.md', '/vault/c.md'],
          activeTab: '/vault/a.md',
        },
      },
      readFile: {
        '/vault/a.md': '# A',
        '/vault/b.md': '# B',
        '/vault/c.md': '# C',
      },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('a.md')).toBeVisible({ timeout: 5000 })

    // Collect tab labels in DOM order via the filename spans inside each tab item
    const tabLabels = await tabBar.locator('[data-testid="tab-item"] span.truncate').allTextContents()
    const filteredLabels = tabLabels.map((t) => t.trim()).filter((t) => t === 'a.md' || t === 'b.md' || t === 'c.md')

    expect(filteredLabels).toEqual(['a.md', 'b.md', 'c.md'])
  })

  test('TC-13.5 — Session saved on close', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/note.md'],
          activeTab: '/vault/note.md',
        },
      },
      readFile: { '/vault/note.md': '# Note' },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    // Wait for note.md tab to be restored
    const tabBar = page.locator('[data-testid="tab-bar"]')
    await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

    // Simulate window beforeunload event (triggers session save)
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')))

    await page.waitForTimeout(300)

    // Check that the saved config contains the open tab
    const savedConfig = await page.evaluate(() => (window as any).__getSavedConfig())
    const openTabs: string[] = savedConfig?.session?.openTabs ?? []
    expect(openTabs).toContain('/vault/note.md')
  })

  test('TC-13.6 — Unknown extension skipped', async ({ page }) => {
    await setupMock(page, {
      config: {
        rootFolder: '/vault',
        session: {
          openTabs: ['/vault/file.pdf', '/vault/note.md'],
          activeTab: '/vault/note.md',
        },
      },
      readFile: {
        '/vault/file.pdf': '%PDF binary content',
        '/vault/note.md': '# Note',
      },
    })
    await page.goto('/')
    // Wait for app layout to render (tab-bar is always present when rootFolder is set)
    await page.waitForSelector('[data-testid="tab-bar"]')

    const tabBar = page.locator('[data-testid="tab-bar"]')

    // note.md should be present
    await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

    // file.pdf should NOT appear (unknown extension is skipped)
    await expect(tabBar.getByText('file.pdf')).not.toBeVisible()
  })
})
