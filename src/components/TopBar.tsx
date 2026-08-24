import { GameIcon } from './game/GameIcon'

interface TopBarProps {
  coins: number
  completedOrders: number
  soundEnabled: boolean
  onToggleSound: () => void
}

export function TopBar({ coins, completedOrders, soundEnabled, onToggleSound }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand-mark" aria-label="夜市大排档">
        <span className="brand-kicker">地铁口 · 今晚营业</span>
        <strong>夜市大排档</strong>
      </div>

      <div className="top-bar__stats">
        <div className="order-count" title="累计完成订单">
          <span aria-hidden="true">✓</span>
          <b>{completedOrders}</b>
        </div>
        <div className="coin-pill" aria-label={`${coins} 金币`}>
          <span className="coin-icon" aria-hidden="true">¥</span>
          <b>{coins}</b>
        </div>
        <button
          type="button"
          className="sound-button"
          aria-label={soundEnabled ? '关闭音效' : '打开音效'}
          aria-pressed={soundEnabled}
          onClick={onToggleSound}
        >
          <GameIcon name={soundEnabled ? 'sound-on' : 'sound-off'} />
        </button>
      </div>
    </header>
  )
}
