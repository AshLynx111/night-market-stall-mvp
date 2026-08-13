import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const approvedPath = 'src/assets/approved/main-ui/kitchen-screen-user-final.png'
const livePath = 'src/assets/approved/main-ui/kitchen-screen-live-clean.png'
const maskRects = [
  { left: 570, top: 120, width: 210, height: 190 },
  { left: 740, top: 120, width: 220, height: 190 },
  { left: 1120, top: 120, width: 220, height: 190 },
  { left: 320, top: 205, width: 235, height: 330 },
  { left: 665, top: 205, width: 310, height: 330 },
  { left: 1050, top: 205, width: 280, height: 330 },
] as const

const binInteriorPolygons = [
  [[150, 554], [305, 554], [293, 623], [133, 621]],
  [[321, 554], [462, 556], [447, 625], [301, 622]],
  [[125, 634], [290, 636], [274, 725], [94, 722]],
  [[296, 636], [447, 638], [429, 721], [273, 717]],
  [[96, 729], [268, 732], [245, 813], [61, 807]],
  [[274, 731], [431, 734], [411, 816], [250, 811]],
] as const

describe('approved kitchen live derivative', () => {
  it('is pixel aligned to the approved plate and changes only localized customer/bubble masks', async () => {
    const approved = await sharp(approvedPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const live = await sharp(livePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })

    expect(live.info.width).toBe(1672)
    expect(live.info.height).toBe(941)
    let changedOutsideMask = 0
    let changedInsideMask = 0
    for (let y = 0; y < 941; y += 1) {
      for (let x = 0; x < 1672; x += 1) {
        const offset = (y * 1672 + x) * 3
        const changed = Math.max(...[0, 1, 2].map((channel) => Math.abs(approved.data[offset + channel] - live.data[offset + channel]))) > 2
        if (!changed) continue
        const insidePolygon = binInteriorPolygons.some((polygon) => {
          let inside = false
          for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
            const [ax, ay] = polygon[current]
            const [bx, by] = polygon[previous]
            if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside
          }
          return inside
        })
        const inside = insidePolygon || maskRects.some((rect) => x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height)
        if (inside) changedInsideMask += 1
        else changedOutsideMask += 1
      }
    }
    expect(changedInsideMask).toBeGreaterThan(80_000)
    expect(changedOutsideMask).toBe(0)
  })

  it('renders the pixel-aligned derivative as the only visible kitchen background', () => {
    const source = readFileSync('src/components/LandscapeGame.tsx', 'utf8')
    expect(source).toContain("kitchen-screen-live-clean.png")
    expect(source).toContain('data-kitchen-live-plate')
    expect(source).not.toContain('game-screen__background--clean')
  })
})
