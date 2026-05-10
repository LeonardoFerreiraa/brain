import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { ExcalidrawTab } from '../store/useAppStore'

// Known Excalidraw version this app supports
export const KNOWN_EXCALIDRAW_VERSION = 2

export interface ExcalidrawFileData {
  type: string
  version: number
  source?: string
  elements: unknown[]
  appState: Record<string, unknown>
  files?: Record<string, unknown>
  [key: string]: unknown
}

export type ParseResult =
  | { ok: true; data: ExcalidrawFileData; passthrough: Record<string, unknown> }
  | { ok: false; error: string; readOnly?: boolean }

export function parseExcalidrawFile(content: string): ParseResult {
  let raw: ExcalidrawFileData
  try {
    raw = JSON.parse(content) as ExcalidrawFileData
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }

  if (raw.type !== 'excalidraw') {
    return { ok: false, error: 'Not an Excalidraw file' }
  }

  if (typeof raw.version === 'number' && raw.version > KNOWN_EXCALIDRAW_VERSION) {
    return {
      ok: true,
      data: raw,
      passthrough: extractPassthrough(raw),
      // Caller should check data.version > KNOWN_EXCALIDRAW_VERSION for read-only
    }
  }

  return { ok: true, data: raw, passthrough: extractPassthrough(raw) }
}

const KNOWN_FIELDS = new Set(['type', 'version', 'source', 'elements', 'appState', 'files'])

function extractPassthrough(raw: ExcalidrawFileData): Record<string, unknown> {
  const passthrough: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      passthrough[key] = value
    }
  }
  return passthrough
}

export function serializeExcalidrawFile(tab: ExcalidrawTab): string {
  const output = {
    type: 'excalidraw',
    version: KNOWN_EXCALIDRAW_VERSION,
    source: 'brain',
    elements: tab.elements,
    appState: tab.appState,
    files: tab.files,
    ...(tab._passthrough ?? {}),
  }
  return JSON.stringify(output, null, 2)
}

interface CanvasProps {
  tab: ExcalidrawTab
}

type ExcalidrawType = React.ComponentType<{
  initialData: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> }
  onChange: (elements: unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => void
}>

export function Canvas({ tab }: CanvasProps) {
  const updateTabContent = useAppStore(s => s.updateTabContent)
  const markTabDirty = useAppStore(s => s.markTabDirty)
  const containerRef = useRef<HTMLDivElement>(null)
  const isReadOnly = tab._passthrough?.['_readOnly'] === true
  // BUG-10: use state so the dynamic import result triggers a re-render
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<ExcalidrawType | null>(null)

  useEffect(() => {
    let mounted = true
    import('@excalidraw/excalidraw').then(mod => {
      if (mounted) {
        setExcalidrawComponent(() => mod.Excalidraw as ExcalidrawType)
      }
    }).catch(() => {
      // Excalidraw failed to load — show fallback
    })
    return () => { mounted = false }
  }, [])

  if (isReadOnly) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-yellow-50 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-700 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
          Newer format, save disabled
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    )
  }

  const handleChange = (
    elements: unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => {
    updateTabContent(tab.id, {
      elements: elements as ExcalidrawTab['elements'],
      appState: appState as ExcalidrawTab['appState'],
      files: files as ExcalidrawTab['files'],
    })
    markTabDirty(tab.id, true)
  }

  return (
    <div className="flex-1 h-full" ref={containerRef}>
      {ExcalidrawComponent ? (
        <ExcalidrawComponent
          initialData={{
            elements: tab.elements,
            appState: tab.appState,
            files: tab.files,
          }}
          onChange={handleChange}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          Loading Excalidraw...
        </div>
      )}
    </div>
  )
}
