import { test, expect } from './fixtures/electron'

test.describe('TC-16: Error boundary', () => {
  test('TC-16.1 — no error fallback shown on healthy load', async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
    await expect(window.locator('[data-testid="error-boundary-fallback"]')).not.toBeAttached()
  })

  test('TC-16.2 — fallback renders instead of white screen when App throws', async ({ window }) => {
    // ?devThrow=1 is only active when import.meta.env.DEV is true.
    // In the production Electron build the guard is false — the error won't throw.
    // This test requires either a dev-mode Electron launch or a test-only toggle.
    test.fixme(true, 'devThrow guard uses import.meta.env.DEV which is false in prod Electron build. Need dev-mode Electron launch for this test.')

    // In a future dev-mode test setup, navigate to the hash with the devThrow param:
    await window.evaluate(() => {
      window.location.search = '?devThrow=1'
    })
    await window.waitForTimeout(500)
    await expect(window.locator('[data-testid="error-boundary-fallback"]')).toBeVisible()
    await expect(window.getByText('Something went wrong')).toBeVisible()
    await expect(window.getByText('dev: intentional render error for boundary testing')).toBeVisible()
  })

  test('TC-16.3 — try again button resets boundary and re-renders app', async ({ window }) => {
    // Same limitation as TC-16.2 — devThrow guard is inactive in prod build.
    test.fixme(true, 'devThrow guard uses import.meta.env.DEV which is false in prod Electron build. Need dev-mode Electron launch for this test.')

    await window.evaluate(() => {
      window.location.search = '?devThrow=1'
    })
    await window.waitForTimeout(500)
    await expect(window.locator('[data-testid="error-boundary-fallback"]')).toBeVisible()

    // Navigate to clean URL then click try again
    await window.evaluate(() => history.replaceState(null, '', '/'))
    await window.getByRole('button', { name: 'Try again' }).click()

    await expect(window.locator('[data-testid="error-boundary-fallback"]')).not.toBeAttached()
    await expect(window.locator('[data-testid="empty-state"]')).toBeVisible()
  })
})
