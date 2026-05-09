export function inferTabType(filePath: string): 'markdown' | 'excalidraw' | null {
  if (filePath.endsWith('.md')) return 'markdown'
  if (filePath.endsWith('.excalidraw')) return 'excalidraw'
  return null
}

export function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

export function filterSupportedPaths(paths: string[]): string[] {
  return paths.filter(p => inferTabType(p) !== null)
}

export function buildSessionConfig(
  tabFilePaths: string[],
  activeTabId: string | null
): { openTabs: string[]; activeTab: string | null } {
  return { openTabs: tabFilePaths, activeTab: activeTabId }
}
