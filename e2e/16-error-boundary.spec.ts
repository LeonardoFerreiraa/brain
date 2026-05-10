import { test, expect } from '@playwright/test'
import { setupMock } from './helpers/api-mock'

test.describe('TC-16: Error boundary', () => {
  test('TC-16.1 — no error fallback shown on healthy load', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/')
    await page.waitForSelector('[data-testid="empty-state"]')
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).not.toBeAttached()
  })

  test('TC-16.2 — fallback renders instead of white screen when App throws', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/?devThrow=1')
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeVisible()
    await expect(page.getByText('Something went wrong')).toBeVisible()
    await expect(page.getByText('dev: intentional render error for boundary testing')).toBeVisible()
  })

  test('TC-16.3 — try again button resets boundary and re-renders app', async ({ page }) => {
    await setupMock(page, { config: { rootFolder: '/vault' } })
    await page.goto('/?devThrow=1')
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeVisible()

    // Navigate to clean URL then click try again (removes ?devThrow param so re-render succeeds)
    await page.evaluate(() => history.replaceState(null, '', '/'))
    await page.getByRole('button', { name: 'Try again' }).click()

    await expect(page.locator('[data-testid="error-boundary-fallback"]')).not.toBeAttached()
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
  })
})
