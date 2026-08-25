import type { ReactNode } from 'react'

export type UpgradeCardIconKind = 'funds' | 'fire' | 'sign'

const ICON_DRAWINGS: Record<UpgradeCardIconKind, ReactNode> = {
  funds: (
    <>
      <path className="upgrade-card-icon__accent" d="M18 9c2.1 1.4 9.9 1.4 12 0l-2.6 7H20.6L18 9Z" />
      <path className="upgrade-card-icon__detail" d="m17 14 4 3m10-3-4 3" />
      <path className="upgrade-card-icon__main" d="M20.5 16.5C14.4 20 10 26.3 10 33.2 10 38.6 15.1 41 24 41s14-2.4 14-7.8c0-6.9-4.4-13.2-10.5-16.7h-7Z" />
      <circle className="upgrade-card-icon__accent" cx="24" cy="31" r="7" />
      <path className="upgrade-card-icon__detail" d="M24 26.8v8.4m-3.2-6.4h5c2 0 2 2.8 0 2.8h-3.6c-2 0-2 2.8 0 2.8h5" />
    </>
  ),
  fire: (
    <>
      <path className="upgrade-card-icon__main" d="M24.7 42c9 0 15.3-6.1 15.3-14.6 0-6.7-3.8-12-10.1-18.3.4 5.2-1.4 8.5-4.6 11C26 13.3 21 8 16.4 5c.5 8.5-8.4 13.6-8.4 22.4C8 35.9 14.9 42 24.7 42Z" />
      <path className="upgrade-card-icon__accent" d="M24.2 38c4.8 0 8.2-3.4 8.2-8.1 0-3.4-1.8-6.2-4.6-9.3.1 3.3-1.4 5-3 6.1.2-4-1.8-7.4-4.5-9.7.2 5.7-4.4 8.3-4.4 13 0 4.6 3.4 8 8.3 8Z" />
    </>
  ),
  sign: (
    <>
      <path className="upgrade-card-icon__detail" d="M24 6v5M18 6h12" />
      <path className="upgrade-card-icon__accent" d="M17 11h14l3 5H14l3-5Z" />
      <path className="upgrade-card-icon__main" d="M15 16h18l-1.4 20H16.4L15 16Z" />
      <path className="upgrade-card-icon__accent" d="M19 16h10l-.8 20h-8.4L19 16Z" />
      <path className="upgrade-card-icon__detail" d="M15.6 22h16.8M15.2 29h17.6M16.4 36h15.2M19 40h10M24 36v4" />
    </>
  ),
}

export function UpgradeCardIcon({ kind }: { kind: UpgradeCardIconKind }) {
  return (
    <svg
      className={`upgrade-card-icon upgrade-card-icon--${kind}`}
      data-upgrade-card-icon={kind}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_DRAWINGS[kind]}
    </svg>
  )
}
