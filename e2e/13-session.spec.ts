import { test, expect } from './fixtures/electron'
import { createVaultFile } from './helpers/vault'
import { join } from 'node:path'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { _electron as electron } from '@playwright/test'

// Helper to launch app with a custom session config
async function launchWithSession(vault: string, session: { openTabs: string[]; activeTab: string | null }, workerIndex: number) {
  const userData = await mkdtemp(join(tmpdir(), `brain-session-${workerIndex}-`))
  await mkdir(userData, { recursive: true })
  await writeFile(join(userData, 'config.json'), JSON.stringify({
    version: 1,
    rootFolder: vault,
    theme: 'light',
    session,
    recentFolders: [],
    window: { x: 100, y: 100, width: 1200, height: 800, maximized: false },
  }))
  const app = await electron.launch({
    args: [resolve('dist-electron/main.js'), `--user-data-dir=${userData}`],
    env: { ...process.env, NODE_ENV: 'test' },
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userData }
}

test.describe('TC-13: Session Restore', () => {
  test('TC-13.1 — Open tabs restored on relaunch', async ({ vault }, testInfo) => {
    await createVaultFile(vault, 'note.md', '# Note')
    await createVaultFile(vault, 'drawing.excalidraw', JSON.stringify({ elements: [], appState: {} }))

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'note.md'), join(vault, 'drawing.excalidraw')],
      activeTab: join(vault, 'note.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      const tabBar = page.locator('[data-testid="tab-bar"]')
      await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })
      await expect(tabBar.getByText('drawing.excalidraw')).toBeVisible({ timeout: 5000 })
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('TC-13.2 — Active tab restored', async ({ vault }, testInfo) => {
    await createVaultFile(vault, 'note.md', '# Note')

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'note.md')],
      activeTab: join(vault, 'note.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      const tabBar = page.locator('[data-testid="tab-bar"]')
      await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

      // Check that the tab has active styling
      const activeTab = tabBar.locator('[class*="border-blue-500"], [class*="active"], [aria-selected="true"]').first()
      await expect(activeTab).toBeVisible()
      await expect(activeTab).toContainText('note.md')
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('TC-13.3 — Missing file silently skipped', async ({ vault }, testInfo) => {
    // deleted.md doesn't exist on disk — only note.md does
    await createVaultFile(vault, 'note.md', '# Note')

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'deleted.md'), join(vault, 'note.md')],
      activeTab: join(vault, 'note.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      const tabBar = page.locator('[data-testid="tab-bar"]')

      // note.md should be present
      await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

      // deleted.md should NOT appear
      await expect(tabBar.getByText('deleted.md')).not.toBeVisible()

      // No error toast / error message should appear
      await expect(page.getByText(/error/i)).not.toBeVisible()
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('TC-13.4 — Tab order preserved', async ({ vault }, testInfo) => {
    await createVaultFile(vault, 'a.md', '# A')
    await createVaultFile(vault, 'b.md', '# B')
    await createVaultFile(vault, 'c.md', '# C')

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'a.md'), join(vault, 'b.md'), join(vault, 'c.md')],
      activeTab: join(vault, 'a.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      const tabBar = page.locator('[data-testid="tab-bar"]')
      await expect(tabBar.getByText('a.md')).toBeVisible({ timeout: 5000 })

      // Collect tab labels in DOM order
      const tabLabels = await tabBar.locator('[data-testid="tab-item"] span.truncate').allTextContents()
      const filteredLabels = tabLabels.map((t) => t.trim()).filter((t) => t === 'a.md' || t === 'b.md' || t === 'c.md')

      expect(filteredLabels).toEqual(['a.md', 'b.md', 'c.md'])
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('TC-13.5 — Session saved on close', async ({ vault }, testInfo) => {
    await createVaultFile(vault, 'note.md', '# Note')

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'note.md')],
      activeTab: join(vault, 'note.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      // Wait for note.md tab to be restored
      const tabBar = page.locator('[data-testid="tab-bar"]')
      await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

      // Simulate window beforeunload event (triggers session save)
      await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')))

      await page.waitForTimeout(300)

      // Check that the saved config contains the open tab via real IPC
      const savedConfig = await page.evaluate(() => window.api.getConfig())
      const openTabs: string[] = (savedConfig as any)?.session?.openTabs ?? []
      expect(openTabs).toContain(join(vault, 'note.md'))
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })

  test('TC-13.6 — Unknown extension skipped', async ({ vault }, testInfo) => {
    await createVaultFile(vault, 'file.pdf', '%PDF binary content')
    await createVaultFile(vault, 'note.md', '# Note')

    const { app, page, userData } = await launchWithSession(vault, {
      openTabs: [join(vault, 'file.pdf'), join(vault, 'note.md')],
      activeTab: join(vault, 'note.md'),
    }, testInfo.workerIndex)

    try {
      await page.waitForSelector('[data-testid="tab-bar"]')

      const tabBar = page.locator('[data-testid="tab-bar"]')

      // note.md should be present
      await expect(tabBar.getByText('note.md')).toBeVisible({ timeout: 5000 })

      // file.pdf should NOT appear (unknown extension is skipped)
      await expect(tabBar.getByText('file.pdf')).not.toBeVisible()
    } finally {
      await app.close().catch(() => {})
      await rm(userData, { recursive: true, force: true }).catch(() => {})
    }
  })
})
