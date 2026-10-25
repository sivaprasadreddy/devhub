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
        <label className="field">
          <span>Preferred IDE</span>
          <input type="text" placeholder="e.g. code, idea, zed" disabled />
        </label>
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
