import type { ReactNode } from 'react'

export type GameIconName =
  | 'coin'
  | 'pause'
  | 'sound-on'
  | 'sound-off'
  | 'trash'
  | 'hand'
  | 'heat'
  | 'cut'
  | 'roll'
  | 'extra'
  | 'without'
  | 'sign'

const ICON_PATHS: Record<GameIconName, ReactNode> = {
  coin: <><circle cx="12" cy="12" r="8" /><path d="M9 9.3c.8-1.2 4.8-1 4.8.8 0 2.3-4.9 1-4.9 3.4 0 1.9 4.7 2.1 5.5.6M12 6.7v10.6" /></>,
  pause: <><path d="M8 6v12M16 6v12" /></>,
  'sound-on': <><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="M15 9c1.5 1.6 1.5 4.4 0 6M18 6.5c3 3 3 8 0 11" /></>,
  'sound-off': <><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="m16 9 5 6m0-6-5 6" /></>,
  trash: <><path d="M7 8h10l-1 11H8L7 8Zm-1-3h12M10 5V3h4v2M10 11v5M14 11v5" /></>,
  hand: <><path d="M8.5 12V5.7a1.5 1.5 0 0 1 3 0V10M11.5 9V4.8a1.5 1.5 0 0 1 3 0V10M14.5 9V6a1.5 1.5 0 0 1 3 0v6M8.5 10.5 7 9a1.6 1.6 0 0 0-2.4 2.1l4.2 7c.7 1.1 1.8 1.9 3.6 1.9h1.8c3.1 0 5.3-2.4 5.3-5.5V9a1.5 1.5 0 0 0-3 0v2" /></>,
  heat: <><path d="M12 21c4 0 7-2.7 7-6.5 0-3-1.8-5.2-4.3-7.8.1 2.6-1 3.7-2.1 4.4.2-3.7-2-6.3-4.1-8.1.2 4.3-3.5 6.7-3.5 11.5C5 18.3 8 21 12 21Z" /></>,
  cut: <><path d="m5 18 12-12M7 6l11 11M4.5 4.5l3 1.5-1.5 3-3-1.5 1.5-3Zm12 12 3 1.5-1.5 3-3-1.5 1.5-3Z" /></>,
  roll: <><path d="M5 8h10a4 4 0 1 1 0 8H8M5 8l3-3M5 8l3 3" /></>,
  extra: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></>,
  without: <><circle cx="12" cy="12" r="8" /><path d="M8.5 8.5l7 7" /></>,
  sign: <><path d="M8 5h8l1 5-2 2v7H9v-7l-2-2 1-5Z" /><path d="M10 5V3h4v2M9 12h6" /></>,
}

export function GameIcon({ name, title, className }: {
  name: GameIconName
  title?: string
  className?: string
}) {
  return (
    <svg
      className={`game-icon${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {ICON_PATHS[name]}
    </svg>
  )
}
