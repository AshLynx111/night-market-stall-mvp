import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { LOGICAL_SCENE_HEIGHT, LOGICAL_SCENE_WIDTH } from './geometry'

export function fitGameplayScene(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1
  return Math.min(width / LOGICAL_SCENE_WIDTH, height / LOGICAL_SCENE_HEIGHT)
}

export function useGameplayViewport(): {
  viewportRef: RefObject<HTMLDivElement | null>
  sceneScale: number
  sceneInverseScale: number
} {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [sceneScale, setSceneScale] = useState(1)
  const updateScale = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const bounds = viewport.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return
    const nextScale = fitGameplayScene(bounds.width, bounds.height)
    setSceneScale((current) => Math.abs(current - nextScale) < .0001 ? current : nextScale)
  }, [])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    updateScale()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScale)
    observer?.observe(viewport)
    window.addEventListener('resize', updateScale)
    window.visualViewport?.addEventListener('resize', updateScale)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScale)
      window.visualViewport?.removeEventListener('resize', updateScale)
    }
  }, [updateScale])

  return {
    viewportRef,
    sceneScale,
    sceneInverseScale: sceneScale > 0 ? Math.max(1, 1 / sceneScale) : 1,
  }
}
