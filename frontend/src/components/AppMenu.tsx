import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import type { App } from '../../bindings/devhub/backend'
import AppIcon from './AppIcon'

interface AppMenuProps {
  apps: App[]
  onSelect: (path: string) => void
  // Content of the trigger button.
  trigger: ReactNode
  // The app to mark with a check (the current or preferred choice).
  marked?: string
  markLabel?: string
  className?: string
  disabled?: boolean
  title?: string
}

// AppMenu is a dropdown listing applications with their icons. Native <select>
// cannot render images, so this is a small custom popover. It is positioned
// fixed so it is not clipped by panels with overflow: hidden.
function AppMenu({ apps, onSelect, trigger, marked, markLabel, className = '', disabled, title }: AppMenuProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node))) return
      setOpen(false)
    }
    const dismiss = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [open])

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      setStyle({
        right: window.innerWidth - rect.right,
        minWidth: rect.width,
        ...(below < 260 && rect.top > below ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      })
    }
    setOpen((o) => !o)
  }

  const select = (path: string) => {
    setOpen(false)
    onSelect(path)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`app-menu-trigger ${className}`}
        onClick={toggle}
        disabled={disabled || apps.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
      >
        {trigger}
        <span className="app-menu-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div ref={menuRef} className="app-menu" role="menu" style={style}>
          {apps.map((a) => (
            <button key={a.path} type="button" role="menuitem" className="app-menu-item" onClick={() => select(a.path)}>
              <AppIcon app={a} size={18} />
              <span className="app-menu-name">{a.name}</span>
              {a.path === marked && <span className="muted small">{markLabel ?? '✓'}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default AppMenu
