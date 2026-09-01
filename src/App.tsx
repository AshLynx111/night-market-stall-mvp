import { lazy, Suspense } from 'react'
import { LandscapeGame } from './components/LandscapeGame'
import { getPlaytestConfig } from './analytics/tracker'
import { usePlatformSnapshot } from './platform/react'
import { PlatformInputLock } from './components/platform/PlatformInputLock'

const PlaytestDebugPanel = __POKI_BUILD__ ? null : lazy(() => import('./components/playtest/PlaytestDebugPanel'))

export function App() {
  const playtest = getPlaytestConfig()
  const platform = usePlatformSnapshot()
  return <>
    <LandscapeGame platformBreakActive={platform.breakActive} />
    {playtest.debugMode && PlaytestDebugPanel && <Suspense fallback={null}><PlaytestDebugPanel /></Suspense>}
    <PlatformInputLock active={platform.breakActive} />
  </>
}
