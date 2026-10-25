import { FormEvent, useState } from 'react'
import { ProjectService } from '../../bindings/devhub/backend'
import { errorMessage } from '../errors'

interface CloneFormProps {
  onCloned: () => void
  onCancel: () => void
}

function CloneForm({ onCloned, onCancel }: CloneFormProps) {
  const [url, setUrl] = useState('')
  const [parentDir, setParentDir] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const chooseDir = () => {
    ProjectService.SelectDirectory('Choose where to clone the repository')
      .then((dir) => dir && setParentDir(dir))
      .catch((e) => setError(errorMessage(e)))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    ProjectService.CloneProject(url, parentDir)
      .then(onCloned)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false))
  }

  return (
    <form className="panel clone-form" onSubmit={submit}>
      <div className="panel-header"><h2>Clone repository</h2></div>
      <label className="field">
        <span>Repository URL</span>
        <input
          type="text"
          placeholder="https://github.com/org/repo.git"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          autoFocus
        />
      </label>
      <div className="field">
        <span>Destination</span>
        <div className="field-row">
          <span className="muted path">{parentDir || 'No directory selected'}</span>
          <button type="button" className="btn" onClick={chooseDir} disabled={busy}>Choose…</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !url.trim() || !parentDir}>
          {busy ? 'Cloning…' : 'Clone'}
        </button>
      </div>
    </form>
  )
}

export default CloneForm
