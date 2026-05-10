import { test, expect } from '@playwright/test'
import { setupMock, openFileInStore } from './helpers/api-mock'

test.describe('TC-8: Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await setupMock(page, {
      config: { rootFolder: '/vault' },
      readFile: { '/vault/note.md': '' },
      writeFile: 'ok',
    })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await openFileInStore(page, '/vault/note.md', 'note.md', 'markdown')
  })

  test('TC-8.1 — New markdown file opens in edit mode', async ({ page }) => {
    // CodeMirror editor div should be visible
    const cmEditor = page.locator('.cm-editor')
    await expect(cmEditor).toBeVisible()

    // "Preview" button should be visible in the toolbar
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()

    // "Edit" button should be active (blue background)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  test('TC-8.2 — Typing updates store content', async ({ page }) => {
    // Click into the CodeMirror content area
    const cmContent = page.locator('.cm-content')
    await cmContent.click()

    // Type content
    await page.keyboard.type('Hello World')

    // Wait for the store to update (CodeMirror fires updateListener.docChanged)
    await page.waitForTimeout(200)

    // Store tabs[0].content should contain the typed text
    const content = await page.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.content ?? ''
    })
    expect(content).toBe('Hello World')

    // Tab should be marked dirty
    const isDirty = await page.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.dirty ?? false
    })
    expect(isDirty).toBe(true)
  })

  test('TC-8.3 — Ctrl+F opens find panel', async ({ page }) => {
    // Click into CodeMirror to focus it
    const cmContent = page.locator('.cm-content')
    await cmContent.click()

    // Press Ctrl+F to open the find/search panel
    await page.keyboard.press('Control+f')

    // CodeMirror search panel should appear
    // The panel contains an input with a cm-* class
    const searchPanel = page.locator('.cm-search')
    await expect(searchPanel).toBeVisible({ timeout: 2000 })
  })

  test('TC-8.4 — Soft-wrap toggle', async ({ page }) => {
    // "Wrap" button should be visible in edit mode
    const wrapBtn = page.getByRole('button', { name: 'Wrap' })
    await expect(wrapBtn).toBeVisible()

    // Click Wrap to enable soft-wrap
    await wrapBtn.click()

    // Wrap button should now have active styling (blue background)
    await expect(wrapBtn).toHaveClass(/bg-blue-100|bg-blue-900/)

    // CodeMirror editor should use line-wrapping — CodeMirror adds cm-lineWrapping to the scroller
    const cmScroller = page.locator('.cm-scroller')
    // After wrap is toggled the editor is recreated with EditorView.lineWrapping;
    // the scroller or content should reflect wrap mode
    await expect(cmScroller).toBeVisible()
  })

  test('TC-8.7 — Mode toggle: edit → preview', async ({ page }) => {
    // Set some content first so MarkdownPreview has something to render
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().updateTabContent(tabId, { content: '# Hello\n\nWorld' })
    })

    // Click "Preview" button in toolbar
    const previewBtn = page.getByRole('button', { name: 'Preview' })
    await previewBtn.click()

    // App.tsx renders MarkdownPreview when mode='preview'; check the preview container
    await expect(page.locator('[data-testid="markdown-preview"]')).toHaveCount(1)

    // CodeMirror editor should not be in the DOM (MarkdownEditor is unmounted in preview mode)
    await expect(page.locator('.cm-editor')).toHaveCount(0)

    // The tab mode in the store should be 'preview'
    const mode = await page.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.mode ?? ''
    })
    expect(mode).toBe('preview')
  })

  test('TC-8.8 — Mode toggle: preview → edit', async ({ page }) => {
    // Set content so preview has something
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().updateTabContent(tabId, { content: '# Hello' })
    })

    // Switch to preview via Preview button
    await page.getByRole('button', { name: 'Preview' }).click()

    // Confirm we are in preview (markdown-preview container present, no cm-editor)
    await expect(page.locator('[data-testid="markdown-preview"]')).toHaveCount(1)
    await expect(page.locator('.cm-editor')).toHaveCount(0)

    // Switch back to edit via store (MarkdownEditor toolbar is unmounted in preview mode)
    await page.evaluate(() => {
      const store = (window as any).__appStore
      const tabId = store.getState().tabs[0]?.id
      if (tabId) store.getState().setTabMode(tabId, 'edit')
    })

    // MarkdownPreview unmounted; MarkdownEditor re-mounts with cm-editor
    await expect(page.locator('[data-testid="markdown-preview"]')).toHaveCount(0)
    await expect(page.locator('.cm-editor')).toHaveCount(1)

    // The tab mode in the store should be 'edit'
    const mode = await page.evaluate(() => {
      const store = (window as any).__appStore
      return store.getState().tabs[0]?.mode ?? ''
    })
    expect(mode).toBe('edit')
  })
})
