export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

export function isSupported(filePath: string): boolean {
  const ext = getFileExtension(filePath)
  return ext === '.md' || ext === '.excalidraw'
}
