import { useCallback, useEffect, useState } from 'react'
import { LauncherService } from '../bindings/devhub/backend'
import type { App, Preferences } from '../bindings/devhub/backend'

export interface Launchers {
  terminals: App[]
  ides: App[]
  preferences: Preferences
}

// useLaunchers loads installed terminals/IDEs and the user's preferences.
export function useLaunchers(): [Launchers | null, (p: Preferences) => Promise<void>] {
  const [launchers, setLaunchers] = useState<Launchers | null>(null)

  useEffect(() => {
    Promise.all([LauncherService.ListTerminals(), LauncherService.ListIDEs(), LauncherService.GetPreferences()])
      .then(([terminals, ides, preferences]) => setLaunchers({ terminals: terminals ?? [], ides: ides ?? [], preferences }))
      .catch(console.error)
  }, [])

  const save = useCallback(async (preferences: Preferences) => {
    await LauncherService.SavePreferences(preferences)
    setLaunchers((l) => (l ? { ...l, preferences } : l))
  }, [])

  return [launchers, save]
}

