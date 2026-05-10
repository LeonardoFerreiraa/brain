import { test, expect } from './fixtures/electron'

test.describe('TC-15: Tailwind CSS smoke', () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector('[data-testid="empty-state"]')
  })

  test('TC-15.1 — flex utility applies display:flex to layout container', async ({ window }) => {
    const display = await window.evaluate(() => {
      const el = document.querySelector('.flex.h-screen.overflow-hidden') as HTMLElement | null
      return el ? getComputedStyle(el).display : null
    })
    expect(display).toBe('flex')
  })

  test('TC-15.2 — h-screen utility sets full viewport height', async ({ window }) => {
    const [height, vh] = await window.evaluate(() => {
      const el = document.querySelector('.h-screen') as HTMLElement | null
      return [el ? getComputedStyle(el).height : null, window.innerHeight + 'px']
    })
    expect(height).toBe(vh)
  })

  test('TC-15.3 — body has no flex centering (Vite template default removed)', async ({ window }) => {
    const bodyDisplay = await window.evaluate(() => getComputedStyle(document.body).display)
    expect(bodyDisplay).toBe('block')
  })

  test('TC-15.4 — dark utility class applies when .dark on html', async ({ window }) => {
    await window.evaluate(() => document.documentElement.classList.add('dark'))
    const bg = await window.evaluate(() => {
      const el = document.querySelector('[data-testid="empty-state"]') as HTMLElement | null
      return el ? getComputedStyle(el).color : null
    })
    // dark:text-gray-500 should apply — color must not be the default black
    expect(bg).not.toBeNull()
    expect(bg).not.toBe('rgb(0, 0, 0)')
  })
})
