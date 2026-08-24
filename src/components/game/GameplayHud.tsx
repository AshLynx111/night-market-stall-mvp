import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { GameIcon } from './GameIcon'

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
    <header className="gameplay-hud" aria-label="营业信息">
      <button className="gameplay-hud__day" type="button" {...touchSafeAction(onHome)} aria-label="返回主页">
        <span>第 {day} 天</span>
      </button>
      <div
        className="gameplay-hud__orders"
        role="progressbar"
        aria-label={`已完成订单 ${served}，目标 ${target}`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={served}
      >
        <b>订单 {served}/{target}</b>
        <i aria-hidden="true"><span style={{ width: `${progress}%` }} /></i>
      </div>
      <div className="gameplay-hud__coins" aria-label={`当前资金 ${coins} 元`}>
        <GameIcon name="coin" />
        <b>¥{coins}</b>
      </div>
      <button className="gameplay-hud__control gameplay-hud__control--pause" type="button" {...touchSafeAction(onPause)} aria-label="暂停并打开菜单" aria-keyshortcuts="Escape">
        <GameIcon name="pause" />
      </button>
      <button className="gameplay-hud__control gameplay-hud__control--sound" type="button" {...touchSafeAction(onSound)} aria-label={sound ? '关闭音乐' : '开启音乐'} aria-pressed={!sound} aria-keyshortcuts="M">
        <GameIcon name={sound ? 'sound-on' : 'sound-off'} />
      </button>
    </header>
  )
}
