import type { ReactNode } from 'react'

export type UpgradeCardIconKind = 'funds' | 'fire' | 'sign'

const ICON_FORMS: Record<UpgradeCardIconKind, string> = {
  funds: 'pouch',
  fire: 'stove',
  sign: 'plaque',
}

const MATERIALS: Record<UpgradeCardIconKind, {
  body: [string, string, string]
  accent: [string, string, string]
}> = {
  funds: { body: ['#f2bd63', '#c8792f', '#8c421e'], accent: ['#ffe08a', '#d99432', '#9f561f'] },
  fire: { body: ['#d99550', '#93492e', '#602d21'], accent: ['#ffe37d', '#f08b30', '#c74822'] },
  sign: { body: ['#e5a65b', '#aa5d32', '#71361f'], accent: ['#f8d476', '#c98531', '#8b4a21'] },
}

function MaterialDefs({ kind }: { kind: UpgradeCardIconKind }) {
  const material = MATERIALS[kind]
  return (
    <defs>
      <linearGradient id={`${kind}-body`} x1="8" y1="7" x2="40" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={material.body[0]} />
        <stop offset=".5" stopColor={material.body[1]} />
        <stop offset="1" stopColor={material.body[2]} />
      </linearGradient>
      <linearGradient id={`${kind}-accent`} x1="14" y1="12" x2="35" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={material.accent[0]} />
        <stop offset=".52" stopColor={material.accent[1]} />
        <stop offset="1" stopColor={material.accent[2]} />
      </linearGradient>
      <linearGradient id={`${kind}-inset`} x1="24" y1="23" x2="24" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#35150d" stopOpacity="0" />
        <stop offset="1" stopColor="#35150d" stopOpacity=".58" />
      </linearGradient>
    </defs>
  )
}

function FundsDrawing({ kind }: { kind: UpgradeCardIconKind }) {
  return (
    <g data-icon-form="pouch">
      <path className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} d="M17.5 9.5c3.3 1.8 9.7 1.8 13 0l-2.8 7h-7.4l-2.8-7Z" />
      <path className="upgrade-card-icon__detail" d="m16.5 14.5 4.3 2.8m10.7-2.8-4.3 2.8" />
      <path className="upgrade-card-icon__body" fill={`url(#${kind}-body)`} d="M20.3 16.5C14.1 20 9.7 26.2 9.7 33.2c0 5.8 5.1 8.4 14.3 8.4s14.3-2.6 14.3-8.4c0-7-4.4-13.2-10.6-16.7h-7.4Z" />
      <path className="upgrade-card-icon__shade" fill={`url(#${kind}-inset)`} d="M10.8 32.8c4.2 2.1 9.3 3.1 14.4 2.7 5.1-.3 9.3-1.7 12-4.1.7 5.5-4.4 8.5-13.2 8.5-8.2 0-12.9-2.3-13.2-7.1Z" />
      <path className="upgrade-card-icon__highlight" d="M15.1 25.7c1.4-2.7 3.4-4.7 5.6-5.9" />
      <circle className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} cx="31.3" cy="34" r="7.3" />
      <circle className="upgrade-card-icon__detail" cx="31.3" cy="34" r="4.6" />
      <path className="upgrade-card-icon__detail" d="M29.6 32.3h3.4v3.4h-3.4z" />
      <path className="upgrade-card-icon__highlight" d="M27.7 31.2c.8-1.4 2.1-2.2 3.7-2.4" />
    </g>
  )
}

function StoveDrawing({ kind }: { kind: UpgradeCardIconKind }) {
  return (
    <g data-icon-form="stove">
      <path className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} d="M24 19.2c4.3 0 7.2-3 7.2-7.1 0-3.1-1.7-5.5-4.8-8.3.2 2.8-.9 4.5-2.5 5.7.1-3.2-2.1-5.5-4.3-7.1.2 4.1-3.1 6.5-3.1 9.8 0 4 3 7 7.5 7Z" />
      <path className="upgrade-card-icon__highlight" d="M20 10.7c.4-1.3 1-2.3 1.8-3.3" />
      <path className="upgrade-card-icon__body" fill={`url(#${kind}-body)`} d="M12 19h24l3 17.2c.5 3-1.7 5.8-4.8 5.8H13.8c-3.1 0-5.3-2.8-4.8-5.8L12 19Z" />
      <path className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} d="M10.5 18.8c0-1.5 1.2-2.8 2.8-2.8h21.4c1.6 0 2.8 1.3 2.8 2.8v2.7h-27v-2.7Z" />
      <path className="upgrade-card-icon__shade" fill={`url(#${kind}-inset)`} d="M10.4 31.3c4.8 2 9.2 2.8 13.6 2.8 4.5 0 8.9-.8 13.6-2.8l.9 5.1c.4 2.4-1.4 4.6-3.8 4.6H13.3c-2.4 0-4.2-2.2-3.8-4.6l.9-5.1Z" />
      <path className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} d="M17.5 26.5h13l2 9h-17l2-9Z" />
      <path className="upgrade-card-icon__detail" d="M20.5 33.5h7M16 42v2m16-2v2M17 21.5h14" />
      <path className="upgrade-card-icon__highlight" d="M13.7 24.2 12 34.5" />
    </g>
  )
}

function SignDrawing({ kind }: { kind: UpgradeCardIconKind }) {
  return (
    <g data-icon-form="plaque">
      <path className="upgrade-card-icon__detail" d="M16 7.5 18.5 14M32 7.5 29.5 14M13 7.5h22" />
      <circle className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} cx="13" cy="7.5" r="2" />
      <circle className="upgrade-card-icon__accent" fill={`url(#${kind}-accent)`} cx="35" cy="7.5" r="2" />
      <path className="upgrade-card-icon__body" fill={`url(#${kind}-body)`} d="M9.5 14h29l3.2 4-2.2 4v13.5l-4 5h-23l-4-5V22l-2.2-4 3.2-4Z" />
      <path className="upgrade-card-icon__shade" fill={`url(#${kind}-inset)`} d="M9.5 29.5c8 2.7 20.9 2.7 30 0v6l-4 4h-23l-3-4v-6Z" />
      <path className="upgrade-card-icon__accent" fill="none" d="M12.5 18h23v17.5l-2 2h-19l-2-2V18Z" />
      <path className="upgrade-card-icon__highlight" d="M13.8 20.8v10.7M16 17h15" />
      <path className="upgrade-card-icon__detail" d="M17 25.2c4.6-1 9.4-1 14 0M18.5 30.5h11" />
    </g>
  )
}

const ICON_DRAWINGS: Record<UpgradeCardIconKind, (kind: UpgradeCardIconKind) => ReactNode> = {
  funds: (kind) => <FundsDrawing kind={kind} />,
  fire: (kind) => <StoveDrawing kind={kind} />,
  sign: (kind) => <SignDrawing kind={kind} />,
}

export function UpgradeCardIcon({ kind }: { kind: UpgradeCardIconKind }) {
  return (
    <svg
      className={`upgrade-card-icon upgrade-card-icon--${kind}`}
      data-upgrade-card-icon={kind}
      data-icon-form={ICON_FORMS[kind]}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <MaterialDefs kind={kind} />
      {ICON_DRAWINGS[kind](kind)}
    </svg>
  )
}
