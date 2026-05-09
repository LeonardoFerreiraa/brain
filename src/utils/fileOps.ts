import path from 'node:path'

// Auto-increment filename if name is taken
export function autoIncrementName(baseName: string, ext: string, existingNames: Set<string>): string {
  let name = baseName + ext
  let counter = 2
  while (existingNames.has(name)) {
    name = `${baseName} ${counter}${ext}`
    counter++
  }
  return name
}

// Split filename into base and extension
export function splitFileName(fileName: string): { base: string; ext: string } {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return { base: fileName, ext: '' }
  // Handle .excalidraw double extension
  if (fileName.endsWith('.excalidraw')) {
    return { base: fileName.slice(0, -'.excalidraw'.length), ext: '.excalidraw' }
  }
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot) }
}

// Validate rename: non-empty, no path separators
export function validateNewName(name: string): string | null {
  if (!name.trim()) return 'Name cannot be empty'
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain path separators'
  if (name.startsWith('.')) return 'Name cannot start with a dot'
  return null
}

// Build new path for rename (same directory)
export function buildRenamedPath(oldPath: string, newName: string): string {
  const dir = path.dirname(oldPath)
  return path.join(dir, newName)
}

// Check if a file path is supported (for tab type inference)
export function inferFileType(filePath: string): 'markdown' | 'excalidraw' | null {
  if (filePath.endsWith('.md')) return 'markdown'
  if (filePath.endsWith('.excalidraw')) return 'excalidraw'
  return null
}

// Generate new file path in rootFolder
export function buildNewFilePath(rootFolder: string, fileName: string): string {
  return path.join(rootFolder, fileName)
}
