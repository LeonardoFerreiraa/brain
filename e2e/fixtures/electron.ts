import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

export type ElectronFixtures = {
  electronApp: ElectronApplication
  window: Page
  vault: string
}

export type ElectronOptions = {
  // 'auto' = use vault fixture path as rootFolder
  // null = no rootFolder (first-run / FolderPrompt)
  // string = use specific path
  initialRootFolder: string | null | 'auto'
  initialTheme: 'light' | 'dark'
}

export const test = base.extend<ElectronFixtures & ElectronOptions>({
  initialRootFolder: ['auto', { option: true }],
  initialTheme: ['light', { option: true }],

  vault: async ({}, use, testInfo) => {
    const dir = await mkdtemp(join(tmpdir(), `brain-vault-${testInfo.workerIndex}-`))
    await use(dir)
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  },

  electronApp: async ({ vault, initialRootFolder, initialTheme }, use, testInfo) => {
    const userData = await mkdtemp(join(tmpdir(), `brain-data-${testInfo.workerIndex}-`))
    const rootFolder = initialRootFolder === 'auto' ? vault : initialRootFolder
    if (rootFolder !== null) {
      await mkdir(userData, { recursive: true })
      await writeFile(join(userData, 'config.json'), JSON.stringify({
        version: 1,
        rootFolder,
        theme: initialTheme,
        session: { openTabs: [], activeTab: null },
        recentFolders: [],
        window: { x: 100, y: 100, width: 1200, height: 800, maximized: false },
      }))
    }
    const app = await electron.launch({
      args: [resolve('dist-electron/main.js'), `--user-data-dir=${userData}`],
      env: { ...process.env, NODE_ENV: 'test' },
    })
    await use(app)
    await app.close().catch(() => {})
    await rm(userData, { recursive: true, force: true }).catch(() => {})
  },

  window: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
})

export { expect } from '@playwright/test'
