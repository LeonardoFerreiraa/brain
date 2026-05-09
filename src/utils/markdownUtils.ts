export function getWordCount(content: string): number {
  return content.trim() === '' ? 0 : content.trim().split(/\s+/).length
}

export function getLineCount(content: string): number {
  return content.split('\n').length
}

export function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

export function isMarkdownEmpty(content: string): boolean {
  return content.trim() === ''
}
