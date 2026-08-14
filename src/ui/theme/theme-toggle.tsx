'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { THEME_PREFERENCES, type ThemePreference } from './theme'
import { useTheme } from './theme-provider'

const OPTIONS: Record<ThemePreference, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Terang', Icon: Sun },
  dark: { label: 'Gelap', Icon: Moon },
  system: { label: 'Sistem', Icon: Monitor },
}

/**
 * A three-state segmented control rather than a two-state toggle: "follow the
 * system" is a real preference, and collapsing it into light/dark silently
 * overrides a choice the user already made at the OS level.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Tema tampilan"
      className={cn(
        'border-border bg-sunken inline-flex items-center gap-0.5 rounded-md border p-0.5',
        className,
      )}
    >
      {THEME_PREFERENCES.map((option) => {
        const { label, Icon } = OPTIONS[option]
        const selected = preference === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            title={label}
            onClick={() => setPreference(option)}
            className={cn(
              'grid size-8 place-items-center rounded-sm transition-colors duration-(--d-fast)',
              'focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-1',
              selected ? 'bg-surface text-fg shadow-raised' : 'text-fg-subtle hover:text-fg',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="sr-only">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
