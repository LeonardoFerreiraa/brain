import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { Page, ElectronApplication } from '@playwright/test'

// Create a file in the vault (call BEFORE launching app for initial scan, or AFTER and wait for sidebar)
export async function createVaultFile(vault: string, name: string, content = ''): Promise<string> {
  const filePath = join(vault, name)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

// Read a file from the vault (for assertions)
export async function readVaultFile(vault: string, name: string): Promise<string> {
  return readFile(join(vault, name), 'utf-8')
}

// Check if a vault file exists
export async function vaultFileExists(vault: string, name: string): Promise<boolean> {
  try {
    await readFile(join(vault, name))
    return true
  } catch { return false }
}

// Open a file tab via __appStore (works in Electron renderer)
export async function openFileInStore(
  page: Page,
  filePath: string,
  fileName: string,
  type: 'markdown' | 'excalidraw',
) {
  await page.evaluate(
    ({ filePath, fileName, type }) => {
      const store = (window as any).__appStore
      if (!store) throw new Error('__appStore not exposed')
      return store.getState().openFile(filePath, fileName, type)
    },
    { filePath, fileName, type },
  )
}

// Mock the pick-folder dialog at main-process level
export async function mockPickFolder(app: ElectronApplication, folderPath: string | null) {
  await app.evaluate((_, path) => {
    ;(global as Record<string, unknown>).__e2ePickFolder = path
  }, folderPath)
}
