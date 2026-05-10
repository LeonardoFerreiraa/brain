import { test, expect } from './fixtures/electron'

test('app loads without crashing', async ({ window }) => {
  await expect(window.locator('#root')).toBeAttached()
})

test('page has no console errors on load', async ({ window }) => {
  const errors: string[] = []
  window.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await window.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})

test('app initial state matches visual snapshot', async ({ window }) => {
  await window.waitForSelector('[data-testid="empty-state"]')
  await expect(window).toHaveScreenshot('app-initial-state.png')
})
