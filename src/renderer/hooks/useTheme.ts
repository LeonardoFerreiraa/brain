import { useEffect, useState } from 'react'
import { resolveEffectiveTheme, applyThemeToDocument } from '../../utils/themeUtils'
import type { ThemeSetting, EffectiveTheme } from '../../utils/themeUtils'

export function useTheme() {
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>('system')
  const [systemIsDark, setSystemIsDark] = useState(false)

  // Load theme from config on mount
  useEffect(() => {
    void (async () => {
      const config = (await window.api.getConfig()) as { theme?: ThemeSetting }
      if (config.theme) setThemeSetting(config.theme)
    })()
  }, [])

  // Listen for system theme changes from main process
  useEffect(() => {
    const off = window.api.onThemeChanged((isDark: boolean) => {
      setSystemIsDark(isDark)
    })
    return off
  }, [])

  const effectiveTheme: EffectiveTheme = resolveEffectiveTheme(themeSetting, systemIsDark)

  // Apply to document
  useEffect(() => {
    applyThemeToDocument(effectiveTheme)
  }, [effectiveTheme])

  const setTheme = async (setting: ThemeSetting) => {
    setThemeSetting(setting)
    await window.api.setConfig({ theme: setting })
  }

  return { effectiveTheme, themeSetting, setTheme, isDark: effectiveTheme === 'dark' }
}
