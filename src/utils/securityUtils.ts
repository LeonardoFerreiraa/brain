/**
 * Security utility functions for Electron app
 */

/**
 * Validates that a CSP string contains all required security directives
 */
export function isValidCspDirective(csp: string): boolean {
  return (
    csp.includes("default-src") &&
    csp.includes("object-src 'none'") &&
    csp.includes("frame-ancestors 'none'")
  )
}

/**
 * Checks if a URL is safe to open externally (https or http only)
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
