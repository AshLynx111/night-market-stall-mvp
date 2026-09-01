import { trackGameEvent, getPlaytestConfig } from '../../analytics/tracker'
import { safeHttpUrl } from '../../analytics/context'
import { useI18n } from '../../i18n/I18nProvider'

export function configuredFeedbackUrl() {
  return safeHttpUrl(import.meta.env.VITE_PLAYTEST_FEEDBACK_URL)
}

export function PlaytestFeedbackLink({ day }: { day: number }) {
  const { t } = useI18n()
  const config = getPlaytestConfig()
  const url = configuredFeedbackUrl()
  if (!config.playtestMode || !url) return null
  return (
    <a
      className="playtest-feedback-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackGameEvent('feedback_clicked', { day })}
    >{t('playtest.feedback')}</a>
  )
}
