import { useSyncExternalStore } from 'react'
import { platformLifecycle } from './lifecycle'

export function usePlatformSnapshot() {
  return useSyncExternalStore(platformLifecycle.subscribe, platformLifecycle.getSnapshot, platformLifecycle.getSnapshot)
}
