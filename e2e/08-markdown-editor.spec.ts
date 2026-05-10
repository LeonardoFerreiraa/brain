import { test, expect } from './fixtures/electron'
import { openFileInStore, createVaultFile } from './helpers/vault'
import { join } from 'node:path'

test.describe('TC-8: Markdown Editor', () => {
  test.beforeEach(async ({ window, vault }) => {
    await createVaultFile(vault, 'note.md', '')
    await window.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(window, join(vault, 'note.md'), 'note.md', 'markdown')
  })

  test('TC-8.1 — New markdown file opens in edit mode', async ({ window }) => {
    // CodeMirror editor div should be visible
    const cmEditor = window.locator('.cm-editor')
    await expect(cmEditor).toBeVisible()

    // "Preview" button should be visible in the toolbar
    await expect(window.getByRole('button', { name: 'Preview' })).toBeVisible()

    // "Edit" button should be active (blue background)
    await expect(window.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  test('TC-8.2 — Typing updates store content', async ({ window }) => {
    // Click into the CodeMirror content area
    const cmContent = window.locator('.cm-content')
    await cmContent.click()

    // Type content
    await window.keyboard.type('Hello World')

    // Wait for the store to update (CodeMirror fires updateListener.docChanged)
    await window.waitForTimeout(200)

    // Store tabs[0].content should contain the typed text
    const content = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.content ?? ''
    })
    expect(content).toBe('Hello World')

    // Tab should be marked dirty
    const isDirty = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(true)
  })

  test('TC-8.3 — Ctrl+F opens find panel', async ({ window }) => {
    // Click into CodeMirror to focus it
    const cmContent = window.locator('.cm-content')
    await cmContent.click()

    // Press Ctrl+F to open the find/search panel
    await window.keyboard.press('Control+f')

    // CodeMirror search panel should appear
    const searchPanel = window.locator('.cm-search')
    await expect(searchPanel).toBeVisible({ timeout: 2000 })
  })

  test('TC-8.4 — Soft-wrap toggle', async ({ window }) => {
    // "Wrap" button should be visible in edit mode
    const wrapBtn = window.getByRole('button', { name: 'Wrap' })
    await expect(wrapBtn).toBeVisible()

    // Click Wrap to enable soft-wrap
    await wrapBtn.click()

    // Wrap button should now have active styling (blue background)
    await expect(wrapBtn).toHaveClass(/bg-blue-100|bg-blue-900/)

    // CodeMirror editor should use line-wrapping
    const cmScroller = window.locator('.cm-scroller')
    await expect(cmScroller).toBeVisible()
  })

  test('TC-8.7 — Mode toggle: edit → preview', async ({ window }) => {
    // Set some content first so MarkdownPreview has something to render
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().updateTabContent(tabId, { content: '# Hello\n\nWorld' })
    })

    // Click "Preview" button in toolbar
    const previewBtn = window.getByRole('button', { name: 'Preview' })
    await previewBtn.click()

    // App.tsx renders MarkdownPreview when mode='preview'
    await expect(window.locator('[data-testid="markdown-preview"]')).toHaveCount(1)

    // CodeMirror editor should not be in the DOM (MarkdownEditor is unmounted in preview mode)
    await expect(window.locator('.cm-editor')).toHaveCount(0)

    // The tab mode in the store should be 'preview'
    const mode = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.mode ?? ''
    })
    expect(mode).toBe('preview')
  })

  test('TC-8.8 — Mode toggle: preview → edit', async ({ window }) => {
    // Set content so preview has something
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().updateTabContent(tabId, { content: '# Hello' })
    })

    // Switch to preview via Preview button
    await window.getByRole('button', { name: 'Preview' }).click()

    // Confirm we are in preview
    await expect(window.locator('[data-testid="markdown-preview"]')).toHaveCount(1)
    await expect(window.locator('.cm-editor')).toHaveCount(0)

    // Switch back to edit via store
    await window.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().setTabMode(tabId, 'edit')
    })

    // MarkdownPreview unmounted; MarkdownEditor re-mounts with cm-editor
    await expect(window.locator('[data-testid="markdown-preview"]')).toHaveCount(0)
    await expect(window.locator('.cm-editor')).toHaveCount(1)

    // The tab mode in the store should be 'edit'
    const mode = await window.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.mode ?? ''
    })
    expect(mode).toBe('edit')
  })
})
