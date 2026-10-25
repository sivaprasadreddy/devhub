function Settings() {
  return (
    <div className="page">
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
        <p className="muted">Connect a GitHub account to load pull requests, issues, and CI status.</p>
        <button className="btn" disabled>Connect GitHub</button>
      </section>
    </div>
  )
}

export default Settings
