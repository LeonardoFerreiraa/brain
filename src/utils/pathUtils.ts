import path from 'node:path'

export function isUnderRoot(resolvedPath: string, canonicalRoot: string): boolean {
  return resolvedPath.startsWith(canonicalRoot + path.sep) || resolvedPath === canonicalRoot
}

export function atomicTmpPath(filePath: string): string {
  return filePath + '.tmp'
}
