import { useEffect, useReducer, useRef } from 'react'
import { kitchenReducer } from './reducer'
import { createKitchenState } from './state'

export function useKitchenGame(
  day: number,
  seed: number,
  patienceBonusMs = 0,
  initialServedCount = 0,
  guidedTutorial = false,
  initialPatienceRatio?: number,
) {
  const [state, dispatch] = useReducer(
    kitchenReducer,
    { day, seed, patienceBonusMs, initialServedCount, guidedTutorial, initialPatienceRatio },
    ({
      day: initialDay,
      seed: initialSeed,
      patienceBonusMs: initialPatienceBonusMs,
      initialServedCount: servedCount,
      guidedTutorial: initialGuidedTutorial,
      initialPatienceRatio: patienceRatio,
    }) => {
      const safeServedCount = Number.isFinite(servedCount)
        ? Math.min(100, Math.max(0, Math.floor(servedCount)))
        : 0
      const created = createKitchenState(initialDay, initialSeed, initialPatienceBonusMs, initialGuidedTutorial)
      const safePatienceRatio = Number.isFinite(patienceRatio)
        ? Math.min(1, Math.max(.01, patienceRatio ?? 1))
        : 1
      return {
        ...created,
        customers: created.customers.map((customer) => ({ ...customer, patienceMs: customer.maxPatienceMs * safePatienceRatio })),
        servedQualities: Array(safeServedCount).fill(100),
      }
    },
  )
  const previousFrameTime = useRef<number | null>(null)

  useEffect(() => {
    let frameId = 0

    const advance = (timestamp: number) => {
      const previous = previousFrameTime.current
      previousFrameTime.current = timestamp
      if (previous !== null) {
        const deltaMs = Math.min(100, Math.max(0, timestamp - previous))
        if (deltaMs > 0) dispatch({ type: 'TICK', deltaMs })
      }
      frameId = requestAnimationFrame(advance)
    }

    frameId = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return { state, dispatch }
}
