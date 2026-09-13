import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TableIngredient } from './TableIngredient'

describe('TableIngredient visual placement', () => {
  it('keeps the accepted hot-dog food bounds inside its well and its label below the food', () => {
    const markup = renderToStaticMarkup(
      <TableIngredient
        id="hot-dog"
        label="Hot Dog"
        art="hot-dog.webp"
        rackIndex={2}
        rackLayout="approved-2x3"
        findSlotAtPoint={() => null}
        onDrop={vi.fn()}
        onTapEgg={vi.fn()}
        onKeyboardApply={vi.fn()}
      />,
    )

    const host = document.createElement('div')
    host.innerHTML = markup
    const control = host.querySelector('button')!
    const px = (name: string) => parseFloat(control.style.getPropertyValue(name))
    expect(px('--ingredient-rack-inner-width')).toBe(129)
    expect(px('--ingredient-rack-inner-height')).toBe(49)
    expect(px('--ingredient-art-width')).toBeCloseTo(138.411483, 4)
    expect(px('--ingredient-art-height')).toBeCloseTo(58.251497, 4)
    expect(px('--ingredient-contact-width')).toBeCloseTo(115.26, 2)
    expect(px('--ingredient-rack-label-left')).toBe(91)
    expect(px('--ingredient-rack-label-top')).toBe(79)
    expect(px('--ingredient-rack-label-top')).toBeGreaterThan(
      px('--ingredient-rack-inner-top') + px('--ingredient-rack-inner-height'),
    )
    expect(markup).toContain('data-ingredient-food-viewport="true"')
    expect(markup).toContain('data-ingredient-label-for="hot-dog"')
  })
})
