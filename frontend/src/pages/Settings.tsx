import { useState } from 'react'
import type { App, Preferences } from '../../bindings/devhub/backend'
import { errorMessage } from '../errors'
import { useLaunchers } from '../launchers'
import AppIcon from '../components/AppIcon'
import AppMenu from '../components/AppMenu'
import { ActivityState } from '../status'
import { ThemePreference, useTheme } from '../theme'

const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

interface SettingsProps {
  activity: ActivityState | null
}

function Settings({ activity }: SettingsProps) {
  const [theme, setTheme] = useTheme()
  const [launchers, savePreferences] = useLaunchers()
  const [error, setError] = useState('')

  const update = (change: Partial<Preferences>) => {
    if (!launchers) return
    setError('')
    savePreferences({ ...launchers.preferences, ...change }).catch((e) => setError(errorMessage(e)))
  }

  const appSelect = (apps: App[], value: string, onChange: (path: string) => void) => {
    const selected = apps.find((a) => a.path === value)
    return (
      <AppMenu
        apps={apps}
        className="app-select"
        marked={value}
        onSelect={onChange}
        disabled={!launchers}
        trigger={
          selected ? (
            <span className="app-select-value"><AppIcon app={selected} />{selected.name}</span>
          ) : (
            <span className="muted">{launchers ? 'None found' : 'Loading…'}</span>
          )
        }
      />
    )
  }

  return (
    <div className="page">
      <section className="panel settings">
        <div className="panel-header"><h2>Appearance</h2></div>
        <div className="field">
          <span>Theme</span>
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                role="radio"
                aria-checked={theme === t.value}
                className={`segment${theme === t.value ? ' is-active' : ''}`}
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel settings">
        <div className="panel-header"><h2>General</h2></div>
        <label className="field">
          <span>Refresh interval</span>
          <select disabled defaultValue="300">
            <option value="0">Manual only</option>
            <option value="60">Every minute</option>
            <option value="300">Every 5 minutes</option>
            <option value="900">Every 15 minutes</option>
          </select>
        </label>
        <div className="field">
          <span>Preferred terminal</span>
          {appSelect(launchers?.terminals ?? [], launchers?.preferences.terminal ?? '', (terminal) => update({ terminal }))}
        </div>
        <div className="field">
          <span>Preferred IDE</span>
          {appSelect(launchers?.ides ?? [], launchers?.preferences.ide ?? '', (ide) => update({ ide }))}
        </div>
        {error && <p className="error">{error}</p>}
      </section>
      <section className="panel settings">
        <div className="panel-header"><h2>GitHub</h2></div>
        <div className="field">
          <span>Status</span>
          {!activity ? (
            <span className="muted">Checking…</span>
          ) : activity.connected ? (
            <span className="badge badge-success">Connected</span>
          ) : (
            <span className="badge badge-muted">Not connected</span>
          )}
        </div>
        {activity?.error && <p className="error">{activity.error}</p>}
        <p className="muted">
          DevHub uses your GitHub CLI login (<code>gh auth login</code>) or a token in the <code>GITHUB_TOKEN</code>
          {' '}environment variable. Click Refresh after signing in.
        </p>
      </section>
    </div>
  )
}

export default Settings
