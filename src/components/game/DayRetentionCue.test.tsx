import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { retentionCueForDay } from '../../landscape/dayRetention'
import { DayRetentionCue } from './DayRetentionCue'

describe('DayRetentionCue', () => {
  it('renders the next existing day as a concise, accessible preview', () => {
    const markup = renderToStaticMarkup(<DayRetentionCue cue={retentionCueForDay(2)} />)

    expect(markup).toContain('data-day-retention-cue="next"')
    expect(markup).toContain('明日 · 饭量挑战')
    expect(markup).toContain('大胃王解锁')
    expect(markup).toContain('新食材：香菜、洋葱、辣椒粉')
  })

  it('renders a replay goal after the final day without inventing another day', () => {
    const markup = renderToStaticMarkup(<DayRetentionCue cue={null} />)

    expect(markup).toContain('data-day-retention-cue="complete"')
    expect(markup).toContain('六日营业完成')
    expect(markup).toContain('重玩关卡，挑战全三星')
  })
})
