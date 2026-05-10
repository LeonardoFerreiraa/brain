import { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { search } from '@codemirror/search'
import { useAppStore } from '../store/useAppStore'
import type { MarkdownTab } from '../store/useAppStore'

interface MarkdownEditorProps {
  tab: MarkdownTab
  isDark?: boolean
}

export function MarkdownEditor({ tab, isDark = false }: MarkdownEditorProps) {
  const updateTabContent = useAppStore(s => s.updateTabContent)
  const markTabDirty = useAppStore(s => s.markTabDirty)
  const setTabMode = useAppStore(s => s.setTabMode)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [softWrap, setSoftWrap] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      basicSetup,
      markdown(),
      search(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString()
          updateTabContent(tab.id, { content })
          markTabDirty(tab.id, true)
        }
      }),
      ...(isDark ? [oneDark] : []),
      ...(softWrap ? [EditorView.lineWrapping] : []),
    ]

    // BUG-09: use the live editor content when recreating (theme/wrap change),
    // not tab.content which may lag behind pending debounced keystrokes.
    const liveContent = viewRef.current?.state.doc.toString() ?? tab.content

    const view = new EditorView({
      doc: liveContent,
      extensions,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, softWrap]) // Recreate editor when theme or wrap changes

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setTabMode(tab.id, 'edit')}
            className={`px-3 py-1 text-xs ${
              tab.mode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setTabMode(tab.id, 'preview')}
            className={`px-3 py-1 text-xs ${
              tab.mode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Preview
          </button>
        </div>
        {tab.mode === 'edit' && (
          <button
            onClick={() => setSoftWrap(w => !w)}
            className={`px-2 py-1 text-xs rounded border ${
              softWrap
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-700 dark:text-blue-200'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
            }`}
            title="Toggle soft wrap"
          >
            Wrap
          </button>
        )}
      </div>

      {/* Editor / Preview */}
      {tab.mode === 'edit' ? (
        <div
          ref={editorRef}
          className="flex-1 overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
        />
      ) : (
        <div className="flex-1 overflow-auto p-4">
          {/* Preview rendered in MarkdownPreview component (issue #12) */}
          <div className="prose dark:prose-invert max-w-none text-sm text-gray-500 dark:text-gray-400 italic">
            Preview mode — connect MarkdownPreview component
          </div>
        </div>
      )}
    </div>
  )
}
