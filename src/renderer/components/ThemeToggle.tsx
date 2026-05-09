import { useTheme } from '../hooks/useTheme'
import type { ThemeSetting } from '../../utils/themeUtils'

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function ThemeToggle() {
  const { themeSetting, setTheme } = useTheme()

  return (
    <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
      {THEMES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => void setTheme(value)}
          className={`px-2 py-1 text-xs ${
            themeSetting === value
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
