import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createKitchenState } from '../../landscape/kitchen/state'
import { TutorialOverlay, tutorialShortInstruction } from './TutorialOverlay'

describe('TutorialOverlay', () => {
  it('uses concise action copy and SVG hand art without numbered headings or emoji', () => {
    const markup = renderToStaticMarkup(<TutorialOverlay state={createKitchenState(1, 1, 0, 0, true)} sauceSelected={false} />)
    expect(tutorialShortInstruction('noodle')).toBe('点面皮，或拖到铁板')
    expect(tutorialShortInstruction('serve')).toBe('点餐盒，或拖给顾客')
    expect(markup).not.toContain('第一步')
    expect(markup).not.toMatch(/☝|🍳|🗑|🔪/)
  })

  it('announces tutorial completion as one polite atomic update', () => {
    const markup = renderToStaticMarkup(<TutorialOverlay state={createKitchenState(1, 1)} sauceSelected={false} showCompletion />)
    expect(markup).toContain('第一份完成！现在可以同时服务顾客了')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('aria-atomic="true"')
  })
})
