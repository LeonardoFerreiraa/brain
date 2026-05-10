import { test } from './fixtures/electron'

// Single instance lock tests require testing two Electron instances.
// The first instance uses the electron fixture, and would need a second instance
// launched via electron.launch pointing to the same userData dir.

test.describe('TC-12: Single Instance', () => {
  test.skip(
    true,
    'Single instance lock tests require launching two Electron instances and checking inter-process communication. Deferred to integration test suite.',
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
