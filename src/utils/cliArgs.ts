// Parse CLI arguments for file paths
export function extractFilePathArg(argv: string[]): string | null {
  const filePath = argv.find(
    a => a.endsWith('.md') || a.endsWith('.excalidraw')
  )
  return filePath ?? null
}

export function isSupportedFilePath(arg: string): boolean {
  return arg.endsWith('.md') || arg.endsWith('.excalidraw')
}
