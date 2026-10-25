import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'devhub.theme'
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(storageKey)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function applyTheme(preference: ThemePreference) {
  const theme = preference === 'system' ? (systemDark.matches ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = theme
}

// Apply before the first render to avoid a flash of the wrong theme.
applyTheme(readPreference())

// useTheme returns the saved theme preference and a setter that persists it.
// With "system", the theme follows the macOS appearance setting.
export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') {
      return
    }
    const onChange = () => applyTheme('system')
    systemDark.addEventListener('change', onChange)
    return () => systemDark.removeEventListener('change', onChange)
  }, [preference])

  const update = (next: ThemePreference) => {
    localStorage.setItem(storageKey, next)
    setPreference(next)
  }

  return [preference, update]
}
