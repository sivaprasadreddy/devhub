import type { App } from '../../bindings/devhub/backend'

interface AppIconProps {
  app: App | undefined
  size?: number
}

// AppIcon shows an application's icon, falling back to its initial.
function AppIcon({ app, size = 16 }: AppIconProps) {
  if (app?.icon) {
    return <img className="app-icon" src={app.icon} width={size} height={size} alt="" />
  }
  return (
    <span className="app-icon app-icon-fallback" style={{ width: size, height: size, fontSize: size * 0.6 }} aria-hidden="true">
      {app?.name.charAt(0) ?? '?'}
    </span>
  )
}

export default AppIcon
