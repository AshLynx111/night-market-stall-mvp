import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createKitchenState } from '../../landscape/kitchen/state'
import { TutorialOverlay, tutorialShortInstruction } from './TutorialOverlay'

describe('TutorialOverlay', () => {
  it('uses concise action copy and SVG hand art without numbered headings or emoji', () => {
    const markup = renderToStaticMarkup(<TutorialOverlay state={createKitchenState(1, 1, 0, 0, true)} sauceSelected={false} />)
    expect(tutorialShortInstruction('noodle')).toBe('拖面皮到铁板')
    expect(markup).not.toContain('第一步')
    expect(markup).not.toMatch(/☝|🍳|🗑|🔪/)
  })
})
