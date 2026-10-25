import { useState } from 'react'

export type FontSize = 'small' | 'default' | 'large' | 'xlarge'

export const fontSizes: { value: FontSize; label: string; px: number }[] = [
  { value: 'small', label: 'Small', px: 12 },
  { value: 'default', label: 'Default', px: 13 },
  { value: 'large', label: 'Large', px: 15 },
  { value: 'xlarge', label: 'Extra large', px: 17 },
]

const storageKey = 'devhub.fontSize'

function readFontSize(): FontSize {
  const stored = localStorage.getItem(storageKey)
  return fontSizes.some((f) => f.value === stored) ? (stored as FontSize) : 'default'
}

// applyFontSize sets the root font size; all text sizes in styles.css are rem.
function applyFontSize(size: FontSize) {
  const px = fontSizes.find((f) => f.value === size)?.px ?? 13
  document.documentElement.style.fontSize = `${px}px`
}

// Apply before the first render so text does not jump on startup.
applyFontSize(readFontSize())

// useFontSize returns the saved font size and a setter that applies and persists it.
export function useFontSize(): [FontSize, (size: FontSize) => void] {
  const [size, setSize] = useState<FontSize>(readFontSize)

  const update = (next: FontSize) => {
    localStorage.setItem(storageKey, next)
    applyFontSize(next)
    setSize(next)
  }

  return [size, update]
}
