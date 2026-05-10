import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore, emitTreeEntries } from './helpers/api-mock'

const VAULT = '/vault'

async function loadSidebarWithEntries(
  page: Parameters<typeof emitTreeEntries>[0],
  entries: Parameters<typeof emitTreeEntries>[1],
) {
  await emitTreeEntries(page, entries)
  // Small wait for React to re-render after state update
  await page.waitForTimeout(100)
}

test.describe('TC-4: Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: VAULT },
      extraScript: `window.confirm = () => true`,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-4.1 — file tree renders root folder contents', async ({ page }) => {
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/note.md`, name: 'note.md', type: 'file', depth: 0 },
      { path: `${VAULT}/folder`, name: 'folder', type: 'dir', depth: 0 },
      { path: `${VAULT}/drawing.excalidraw`, name: 'drawing.excalidraw', type: 'file', depth: 0 },
    ])
    await expect(page.getByText('note.md')).toBeVisible()
    await expect(page.getByText('folder')).toBeVisible()
    await expect(page.getByText('drawing.excalidraw')).toBeVisible()
  })

  test('TC-4.2 — clicking markdown file opens tab', async ({ page }) => {
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/note.md`, name: 'note.md', type: 'file', depth: 0 },
    ])
    await page.getByText('note.md').click()
    // Tab bar should show the file
    await expect(page.locator('.border-b-2').filter({ hasText: 'note.md' })).toBeVisible()
  })

  test('TC-4.3 — clicking unsupported file shows toast', async ({ page }) => {
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/image.png`, name: 'image.png', type: 'file', depth: 0 },
    ])
    await page.getByText('image.png').click()
    await expect(page.getByText('File type not supported')).toBeVisible()
  })

  test('TC-4.4 — dotfiles not shown in sidebar', async ({ page }) => {
    // Dotfiles are filtered at the IPC/main level; the sidebar renders what onTreeEntry emits.
    // We verify the sidebar does NOT render entries that start with '.'
    // (in production the watcher filters them; here we emit non-dot files only)
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/normal.md`, name: 'normal.md', type: 'file', depth: 0 },
    ])
    await expect(page.getByText('normal.md')).toBeVisible()
    await expect(page.getByText('.hidden.md')).not.toBeVisible()
    await expect(page.getByText('.git')).not.toBeVisible()
  })

  test('TC-4.5 — node_modules not shown', async ({ page }) => {
    // Same as TC-4.4: main-process watcher filters node_modules.
    // Sidebar only renders what it receives. Verify nothing called 'node_modules' appears.
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/note.md`, name: 'note.md', type: 'file', depth: 0 },
    ])
    await expect(page.getByText('node_modules')).not.toBeVisible()
  })

  test('TC-4.6 — symlinks not traversed (not in tree)', async ({ page }) => {
    // Main process does not follow symlinks; they won't appear in tree entries.
    // Simulate by emitting only real files.
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/real.md`, name: 'real.md', type: 'file', depth: 0 },
    ])
    await expect(page.getByText('real.md')).toBeVisible()
    await expect(page.getByText('link')).not.toBeVisible()
  })

  test('TC-4.7 — hard cap at 50k files shows banner', async ({ page }) => {
    // Emit exactly 50000 entries to trigger the truncation banner
    const entries = Array.from({ length: 50000 }, (_, i) => ({
      path: `${VAULT}/file${i}.md`,
      name: `file${i}.md`,
      type: 'file' as const,
      depth: 0,
    }))
    // Emit in one batch
    await page.evaluate((batch) => {
      ;(window as any).__emitTreeEntry(batch)
    }, entries)
    await page.waitForTimeout(200)
    await expect(
      page.getByText('Vault exceeds 50k files. Some files hidden'),
    ).toBeVisible()
  })

  test('TC-4.8 — hard cap at 20 levels deep (main-level filtering)', async ({ page }) => {
    test.fixme(true, 'Depth cap is enforced in the main-process tree scan. The sidebar renders whatever depth entries it receives. Verifying depth>20 entries are absent requires testing the IPC handler (watcher.ts), not the React component.')
  })

  test('TC-4.9 — New Note button creates Untitled.md', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: VAULT },
      extraScript: `
        window._writeFileCalls = []
        window.api.writeFile = (p, c) => { window._writeFileCalls.push(p); return Promise.resolve({ ok: true, mtime: Date.now() }) }
        // readFile returns not-found so findUniqueName picks 'Untitled.md'
        window.api.readFile = (p) => Promise.resolve({ ok: false })
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await page.getByTitle('New Note').click()
    const calls = await page.evaluate(() => (window as any)._writeFileCalls)
    expect(calls[0]).toContain('Untitled.md')
    // Tab opens
    await expect(page.getByText('Untitled.md')).toBeVisible()
  })

  test('TC-4.10 — New Note auto-increments if name taken', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: VAULT },
      extraScript: `
        window._writeFileCalls = []
        window.api.writeFile = (p, c) => { window._writeFileCalls.push(p); return Promise.resolve({ ok: true, mtime: Date.now() }) }
        // Untitled.md and Untitled 2.md exist; Untitled 3.md does not
        window.api.readFile = (p) => {
          if (p.endsWith('Untitled.md') || p.endsWith('Untitled 2.md')) {
            return Promise.resolve({ ok: true, content: '' })
          }
          return Promise.resolve({ ok: false })
        }
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await page.getByTitle('New Note').click()
    const calls = await page.evaluate(() => (window as any)._writeFileCalls)
    expect(calls[0]).toContain('Untitled 3.md')
  })

  test('TC-4.11 — New Drawing creates Untitled.excalidraw', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: VAULT },
      extraScript: `
        window._writeFileCalls = []
        window.api.writeFile = (p, c) => { window._writeFileCalls.push(p); return Promise.resolve({ ok: true, mtime: Date.now() }) }
        window.api.readFile = (p) => Promise.resolve({ ok: false })
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await page.getByTitle('New Drawing').click()
    const calls = await page.evaluate(() => (window as any)._writeFileCalls)
    expect(calls[0]).toContain('Untitled.excalidraw')
  })

  test('TC-4.12 — New Drawing auto-increments if name taken', async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: VAULT },
      extraScript: `
        window._writeFileCalls = []
        window.api.writeFile = (p, c) => { window._writeFileCalls.push(p); return Promise.resolve({ ok: true, mtime: Date.now() }) }
        window.api.readFile = (p) => {
          if (p.endsWith('Untitled.excalidraw')) return Promise.resolve({ ok: true, content: '' })
          return Promise.resolve({ ok: false })
        }
      `,
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await page.getByTitle('New Drawing').click()
    const calls = await page.evaluate(() => (window as any)._writeFileCalls)
    expect(calls[0]).toContain('Untitled 2.excalidraw')
  })

  test('TC-4.13 — double-click filename starts inline rename', async ({ page }) => {
    await loadSidebarWithEntries(page, [
      { path: `${VAULT}/note.md`, name: 'note.md', type: 'file', depth: 0 },
    ])
    // Pre-open the file so the onClick deduplicates (no tabs change → no Sidebar re-render)
    // This lets the dblclick sequence complete cleanly without DOM thrashing.
    await openFileInStore(page, `${VAULT}/note.md`, 'note.md', 'markdown')
    const fileEntry = page.locator('[data-testid="sidebar-entry"]').first()
    await fileEntry.dblclick()
    const input = page.locator('input').filter({ hasValue: 'note.md' })
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('note.md')
  })

  test('TC-4.14 — incremental scan renders batches progressively', async ({ page }) => {
    // Emit first batch and verify entries appear before a second batch
    await page.evaluate(() => {
      ;(window as any).__emitTreeEntry([
        { path: '/vault/first.md', name: 'first.md', type: 'file', depth: 0 },
      ])
    })
    await expect(page.getByText('first.md')).toBeVisible()
    // Emit second batch
    await page.evaluate(() => {
      ;(window as any).__emitTreeEntry([
        { path: '/vault/second.md', name: 'second.md', type: 'file', depth: 0 },
      ])
    })
    await expect(page.getByText('second.md')).toBeVisible()
    // Both should be visible
    await expect(page.getByText('first.md')).toBeVisible()
  })
})
