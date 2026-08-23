import type { CSSProperties } from 'react'
import {
  CUSTOMER_ART_IDS,
  isKitchenCustomerArtId,
  type KitchenCustomerArtId,
} from '../../landscape/kitchen/assets'
import { getCustomerPose } from '../../landscape/kitchen/customerMotion'
import type { OrderBubblePose } from '../../landscape/kitchen/orderBubbleLayout'
import type { CustomerState } from '../../landscape/kitchen/types'
import { CustomerActor } from './CustomerActor'
import { OrderBubble } from './OrderBubble'

function resolveArtId(artId: string): KitchenCustomerArtId {
  if (isKitchenCustomerArtId(artId)) return artId
  const compactIndex = Number(artId.match(/(\d+)$/)?.[1])
  return CUSTOMER_ART_IDS[Number.isInteger(compactIndex) ? compactIndex % CUSTOMER_ART_IDS.length : 0]
}

export function CustomerLane({ customer, bubblePose, critical = false }: {
  customer: CustomerState
  bubblePose?: OrderBubblePose
  critical?: boolean
}) {
  const pose = getCustomerPose(customer.lane, customer.pathProgress)
  const actorStyle = {
    '--customer-x': `${pose.footX}px`,
    '--customer-foot-y': `${pose.footY}px`,
    '--customer-scale': pose.scale,
    '--customer-opacity': pose.opacity,
    '--customer-shadow-opacity': pose.shadowOpacity,
  } as CSSProperties
  return (
    <div className={`kitchen-customer kitchen-customer--${customer.lane}`}>
      {customer.presence === 'active' && bubblePose && <OrderBubble customer={customer} pose={bubblePose} critical={critical} />}
      <CustomerActor customer={customer} artId={resolveArtId(customer.artId)} style={actorStyle} />
    </div>
  )
}
