import { beforeEach, describe, expect, it, vi } from 'vitest'
import { playSound } from './audio'
import { createUiFeedback } from './uiFeedback'

vi.mock('./audio', () => ({ playSound: vi.fn() }))

describe('createUiFeedback', () => {
  beforeEach(() => vi.mocked(playSound).mockClear())

  it('routes navigation, success and upgrade outcomes to the shared sound engine', () => {
    const feedback = createUiFeedback(true)
    feedback.tap()
    feedback.success()
    feedback.upgrade(true)
    feedback.upgrade(false)

    expect(playSound).toHaveBeenNthCalledWith(1, 'tap', true)
    expect(playSound).toHaveBeenNthCalledWith(2, 'success', true)
    expect(playSound).toHaveBeenNthCalledWith(3, 'upgrade', true)
    expect(playSound).toHaveBeenNthCalledWith(4, 'error', true)
  })

  it('keeps the same routing while disabled so the audio engine owns muting', () => {
    const feedback = createUiFeedback(false)
    feedback.tap()
    expect(playSound).toHaveBeenCalledWith('tap', false)
  })
})
