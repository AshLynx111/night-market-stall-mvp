import type { CSSProperties } from 'react'
import {
  customerEmotionArt,
  customerMotionAtlas,
  type KitchenCustomerArtId,
} from '../../landscape/kitchen/assets'
import {
  customerJourneyPhase,
  customerMotionFrame,
} from '../../landscape/kitchen/customerTimeline'
import type { CustomerState } from '../../landscape/kitchen/types'

export function CustomerActor({ customer, artId, style }: {
  customer: CustomerState
  artId: KitchenCustomerArtId
  style: CSSProperties
}) {
  const phase = customerJourneyPhase(customer)
  const moving = phase === 'entry-delay' || phase === 'walking-in'
    || phase === 'turning-out' || phase === 'walking-out'
  const row = phase === 'walking-in' || phase === 'entry-delay'
    ? 0 : phase === 'turning-out' ? 1 : 2
  const frame = customerMotionFrame(customer)

  return (
    <div
      className={`kitchen-customer__actor presence-${customer.presence} mood-${customer.mood}`}
      data-customer-id={customer.id}
      data-customer-art-id={customer.artId}
      data-customer-motion-phase={phase}
      data-order-id={customer.order.id}
      style={style}
    >
      {moving ? (
        <span
          className="kitchen-customer__motion-sprite"
          aria-hidden="true"
          style={{
            '--motion-atlas': `url(${customerMotionAtlas(artId)})`,
            '--motion-frame-x': frame,
            '--motion-frame-y': row,
          } as CSSProperties}
        />
      ) : (
        <img
          className="kitchen-customer__static-art"
          src={customerEmotionArt(artId, phase === 'settling' ? 'ordering' : customer.mood)}
          alt={`${customer.name}角色立绘`}
          draggable={false}
        />
      )}
    </div>
  )
}
