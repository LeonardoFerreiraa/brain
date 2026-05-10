import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useAppStore } from '../store/useAppStore'
import type { Components } from 'react-markdown'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

function wikilinkUrlTransform(url: string): string {
  if (url.startsWith('wikilink:')) return url
  return defaultUrlTransform(url)
}

// Wikilink regex: [[name]] or [[name|alias]]
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

// Simplified remark plugin (avoid mdast type import issues)
// Wikilinks are pre-processed in preprocessWikilinks() before passing to ReactMarkdown
function remarkWikilinks() {
  return () => {}
}

// Preprocess content: convert [[wikilinks]] to markdown links for react-markdown
export function preprocessWikilinks(content: string): string {
  return content.replace(WIKILINK_RE, (_match, name) => {
    const [target, alias] = name.split('|').map((s: string) => s.trim())
    return `[${alias ?? target}](wikilink:${encodeURIComponent(target)})`
  })
}

// Resolve wikilink to file path using vault index
export function resolveWikilink(
  name: string,
  vaultIndex: Map<string, string>
): { path: string; ambiguous: boolean; alternatives: string[] } | null {
  // 1. Exact path match
  if (vaultIndex.has(name)) {
    return { path: vaultIndex.get(name)!, ambiguous: false, alternatives: [] }
  }
  // 2. Basename match
  const basename = name.split('/').pop() ?? name
  const matches: string[] = []
  for (const [key, val] of vaultIndex.entries()) {
    if (key === basename || key.startsWith(basename + '.')) {
      matches.push(val)
    }
  }
  if (matches.length === 0) return null
  // 3. Pick shortest path on ambiguity
  matches.sort((a, b) => a.length - b.length)
  return {
    path: matches[0],
    ambiguous: matches.length > 1,
    alternatives: matches.slice(1),
  }
}

export function isExternalUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function isWikilinkHref(href: string): boolean {
  return href.startsWith('wikilink:')
}

interface MarkdownPreviewProps {
  content: string
  isDark?: boolean
}

export function MarkdownPreview({ content, isDark = false }: MarkdownPreviewProps) {
  const vaultIndex = useAppStore(s => s.vaultIndex)
  const openFile = useAppStore(s => s.openFile)

  const processed = preprocessWikilinks(content)

  const handleWikilink = (name: string) => {
    const decoded = decodeURIComponent(name)
    const resolved = resolveWikilink(decoded, vaultIndex)
    if (!resolved) {
      window.alert(`File not found: ${decoded}`)
      return
    }
    if (resolved.ambiguous) {
      const chosenName = resolved.path.split('/').pop() ?? resolved.path
      window.alert(`Ambiguous link: "${decoded}" — opened "${chosenName}". ${resolved.alternatives.length} other match(es).`)
    }
    const fileName = resolved.path.split('/').pop() ?? resolved.path
    const type = fileName.endsWith('.excalidraw') ? 'excalidraw' : 'markdown'
    openFile(resolved.path, fileName, type)
  }

  const handleExternalLink = async (href: string) => {
    let host: string
    try {
      host = new URL(href).hostname
    } catch {
      return
    }
    const confirmed = window.confirm(`Open "${host}" in browser?`)
    if (confirmed) {
      // @ts-expect-error window.api is injected by electron preload
      await window.api.openExternal(href)
    }
  }

  // eslint-disable-next-line react/prop-types
  const CustomLink: Components['a'] = ({
    href,
    children,
    ...props
  }: {
    href?: string
    children?: ReactNode
    [key: string]: unknown
  }) => {
    if (!href) return <a {...props}>{children}</a>

    if (isWikilinkHref(href)) {
      const name = href.replace('wikilink:', '')
      return (
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleWikilink(name) }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          {...props}
        >
          {children}
        </a>
      )
    }

    if (isExternalUrl(href)) {
      return (
        <a
          href="#"
          rel="noopener noreferrer"
          onClick={(e) => { e.preventDefault(); void handleExternalLink(href) }}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      )
    }

    return <a href={href} {...props}>{children}</a>
  }

  return (
    <div data-testid="markdown-preview" className={`flex-1 overflow-auto p-4 ${isDark ? 'dark' : ''}`}>
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkWikilinks]}
          rehypePlugins={[rehypeHighlight]}
          components={{ a: CustomLink }}
          urlTransform={wikilinkUrlTransform}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </div>
  )
}
