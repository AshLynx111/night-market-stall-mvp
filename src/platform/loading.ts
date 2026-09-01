export function schedulePlatformLoadingFinished(callback: () => void) {
  let sent = false
  const finish = async () => {
    if (sent) return
    sent = true
    const images = [...document.images]
    await Promise.all(images.map(async (image) => {
      if (image.complete) {
        try { await image.decode?.() } catch { /* A failed optional image cannot block startup. */ }
        return
      }
      await new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }))
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    callback()
  }
  if (document.readyState === 'complete') void finish()
  else window.addEventListener('load', () => void finish(), { once: true })
}
