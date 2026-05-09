// Simple hash for dirty-state tracking (not cryptographic)
// Uses a fast string hash (FNV-1a 32-bit variant)
export function computeContentHash(content: string): string {
  let hash = 2166136261 // FNV offset basis
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i)
    hash = (hash * 16777619) >>> 0 // FNV prime, keep 32-bit
  }
  return hash.toString(16)
}

export function hashesMatch(a: string, b: string): boolean {
  return a === b
}

// Excalidraw persisted appState whitelist (for hash computation)
export const EXCALIDRAW_PERSISTED_KEYS: ReadonlyArray<string> = [
  'viewBackgroundColor',
  'gridSize',
  'theme',
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeWidth',
]

export function filterExcalidrawAppState(
  appState: Record<string, unknown>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  for (const key of EXCALIDRAW_PERSISTED_KEYS) {
    if (key in appState) filtered[key] = appState[key]
  }
  return filtered
}

export function computeExcalidrawHash(
  elements: unknown[],
  files: Record<string, unknown>,
  appState: Record<string, unknown>
): string {
  const filtered = filterExcalidrawAppState(appState)
  const canonical = JSON.stringify({ elements, files, appState: filtered })
  return computeContentHash(canonical)
}