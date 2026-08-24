import type { DayRetentionCueModel } from '../../landscape/dayRetention'

export function DayRetentionCue({ cue }: { cue: DayRetentionCueModel | null }) {
  if (!cue) {
    return (
      <div
        className="summary-retention"
        data-day-retention-cue="complete"
        aria-label="六日营业完成。重玩关卡，挑战全三星"
      >
        <b>六日营业完成</b>
        <span>重玩关卡，挑战全三星</span>
      </div>
    )
  }

  return (
    <div
      className="summary-retention"
      data-day-retention-cue="next"
      aria-label={`明日预告。${cue.accessibleDescription}`}
    >
      <b>明日 · {cue.title}</b>
      <span>{cue.shortHook}</span>
    </div>
  )
}
