export type ThemeSetting = 'system' | 'light' | 'dark'
export type EffectiveTheme = 'light' | 'dark'

export function resolveEffectiveTheme(
  setting: ThemeSetting,
  systemIsDark: boolean
): EffectiveTheme {
  if (setting === 'dark') return 'dark'
  if (setting === 'light') return 'light'
  return systemIsDark ? 'dark' : 'light'
}

export function applyThemeToDocument(effectiveTheme: EffectiveTheme): void {
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function getHighlightJsTheme(effectiveTheme: EffectiveTheme): string {
  return effectiveTheme === 'dark' ? 'github-dark' : 'github'
}

export function isValidThemeSetting(value: unknown): value is ThemeSetting {
  return value === 'system' || value === 'light' || value === 'dark'
}
