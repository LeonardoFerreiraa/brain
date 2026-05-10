import { test } from '@playwright/test'

// Single instance lock tests require Electron runtime and cannot be tested in browser mode.
// app.requestSingleInstanceLock() is a Node.js/Electron API not available in the browser.
// These tests must be run with an Electron-aware test runner against the packaged app.

test.describe('TC-12: Single Instance', () => {
  test.skip(
    true,
    'Single instance lock tests require Electron runtime and cannot be tested in browser mode.',
  )

  test('TC-12.1 — Second launch quits immediately', async () => {
    // When a second instance of the app is launched while one is already running,
    // app.requestSingleInstanceLock() returns false in the second instance,
    // causing it to call app.quit() immediately.
  })

  test('TC-12.2 — Second launch focuses first window', async () => {
    // When a second launch is attempted, the first instance receives the
    // 'second-instance' event and calls mainWindow.focus() to bring itself forward.
  })

  test('TC-12.3 — Second launch with file arg opens file', async () => {
    // When the second instance is launched with a .md file path as an argument,
    // the first instance receives the path via the 'second-instance' event and
    // opens the file in a new tab.
  })

  test('TC-12.4 — Second launch with .excalidraw arg', async () => {
    // When the second instance is launched with a .excalidraw file path as an argument,
    // the first instance receives the path via the 'second-instance' event and
    // opens the excalidraw file in a new tab.
  })
})
