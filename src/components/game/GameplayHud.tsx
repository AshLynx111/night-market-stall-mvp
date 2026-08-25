import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { GameIcon } from './GameIcon'
import { useI18n } from '../../i18n/I18nProvider'

export interface GameplayHudProps {
  day: number
  coins: number
  served: number
  target: number
  sound: boolean
  onHome: () => void
  onPause: () => void
  onSound: () => void
}

export function GameplayHud({ day, coins, served, target, sound, onHome, onPause, onSound }: GameplayHudProps) {
  const { t } = useI18n()
  const progress = target > 0 ? Math.min(100, Math.max(0, served / target * 100)) : 0
  const suppressClickFor = useRef<HTMLButtonElement | null>(null)
  const touchSafeAction = (action: () => void) => ({
    onPointerDown: () => { suppressClickFor.current = null },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'touch') return
      const target = event.currentTarget
      suppressClickFor.current = target
      action()
      window.setTimeout(() => {
        if (suppressClickFor.current === target) suppressClickFor.current = null
      }, 0)
    },
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (suppressClickFor.current === event.currentTarget) {
        suppressClickFor.current = null
        return
      }
      action()
    },
  })
  return (
    <header className="gameplay-hud" aria-label={t('hud.label')}>
      <button className="gameplay-hud__day hud-label ui-text-surface ui-text-surface--wood" type="button" {...touchSafeAction(onHome)} aria-label={t('hud.home')}>
        <span>{t('hud.day', { day })}</span>
      </button>
      <div
        className="gameplay-hud__orders hud-label ui-text-surface ui-text-surface--paper"
        role="progressbar"
        aria-label={t('hud.ordersAria', { served, target })}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={served}
      >
        <b>{t('hud.orders', { served, target })}</b>
        <i aria-hidden="true"><span style={{ width: `${progress}%` }} /></i>
      </div>
      <div className="gameplay-hud__coins hud-label ui-text-surface ui-text-surface--wood" aria-label={t('hud.coinsAria', { coins })}>
        <GameIcon name="coin" />
        <b>¥{coins}</b>
      </div>
      <button className="gameplay-hud__control gameplay-hud__control--pause" type="button" {...touchSafeAction(onPause)} aria-label={t('hud.pause')} aria-keyshortcuts="Escape">
        <GameIcon name="pause" />
      </button>
      <button className="gameplay-hud__control gameplay-hud__control--sound" type="button" {...touchSafeAction(onSound)} aria-label={sound ? t('hud.soundOff') : t('hud.soundOn')} aria-pressed={!sound} aria-keyshortcuts="M">
        <GameIcon name={sound ? 'sound-on' : 'sound-off'} />
      </button>
    </header>
  )
}
