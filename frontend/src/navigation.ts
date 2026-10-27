export type PageId = 'dashboard' | 'projects' | 'insights' | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: string
}

export const mainNav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'projects', label: 'Projects', icon: '▤' },
  { id: 'insights', label: 'Insights', icon: '◔' },
]

export const footerNav: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: '⚙' },
]
