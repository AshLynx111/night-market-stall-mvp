import type { DayRetentionCueModel } from '../../landscape/dayRetention'
import { useI18n } from '../../i18n/I18nProvider'

export function DayRetentionCue({ cue }: { cue: DayRetentionCueModel | null }) {
  const { t, domain } = useI18n()
  if (!cue) {
    return (
      <div
        className="summary-retention text-chip ui-text-chip"
        data-day-retention-cue="complete"
        aria-label={t('retention.completeAria')}
      >
        <b>{t('retention.completeTitle')}</b>
        <span>{t('retention.completeHook')}</span>
      </div>
    )
  }

  const localized = domain.retentionText(cue)
  return (
    <div
      className="summary-retention text-chip ui-text-chip"
      data-day-retention-cue="next"
      aria-label={t('retention.tomorrowAria', { description: localized.accessibleDescription })}
    >
      <b>{t('retention.tomorrow', { title: localized.title })}</b>
      <span>{localized.shortHook}</span>
    </div>
  )
}
