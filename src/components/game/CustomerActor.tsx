import type { CSSProperties } from 'react'
import {
  customerEmotionArt,
  type KitchenCustomerArtId,
} from '../../landscape/kitchen/assets'
import { customerJourneyPhase } from '../../landscape/kitchen/customerTimeline'
import type { CustomerState } from '../../landscape/kitchen/types'
import { useI18n } from '../../i18n/I18nProvider'

export function CustomerActor({ customer, artId, style }: {
  customer: CustomerState
  artId: KitchenCustomerArtId
  style: CSSProperties
}) {
  const { t, domain } = useI18n()
  const phase = customerJourneyPhase(customer)
  const displayedMood = phase === 'settling'
    ? 'ordering'
    : phase === 'entry-delay' || phase === 'walking-in'
      ? 'arriving'
      : customer.mood

  return (
    <div
      className={`kitchen-customer__actor presence-${customer.presence} mood-${customer.mood}`}
      data-customer-id={customer.id}
      data-customer-art-id={customer.artId}
      data-customer-motion-phase={phase}
      data-order-id={customer.order.id}
      style={style}
    >
      <img
        className="kitchen-customer__static-art"
        src={customerEmotionArt(artId, displayedMood)}
        alt={t('game.customerArtAlt', { customer: domain.customerText(customer.name) })}
        draggable={false}
      />
    </div>
  )
}
