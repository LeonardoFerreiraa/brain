export const TAB_SOFT_CAP = 20
export const TAB_HARD_CAP = 50

export function inferTabType(filePath: string): 'markdown' | 'excalidraw' | null {
  if (filePath.endsWith('.md')) return 'markdown'
  if (filePath.endsWith('.excalidraw')) return 'excalidraw'
  return null
}

export function checkTabCap(tabCount: number): 'ok' | 'soft' | 'hard' {
  if (tabCount >= TAB_HARD_CAP) return 'hard'
  if (tabCount >= TAB_SOFT_CAP) return 'soft'
  return 'ok'
}
