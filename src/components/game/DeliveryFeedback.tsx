export interface DeliveryFeedbackValue { id: number; income: number; quality: number }
import { useI18n } from '../../i18n/I18nProvider'
import { translate } from '../../i18n/core'

export function qualityLabel(quality: number): string {
  return translate('zh-CN', quality >= 90 ? 'feedback.perfect' : quality >= 75 ? 'feedback.great' : 'feedback.okay')
}

export function DeliveryFeedback({ feedback, held = false }: { feedback: DeliveryFeedbackValue | null; held?: boolean }) {
  const { t } = useI18n()
  if (!feedback) return null
  return (
    <aside className={`delivery-feedback text-chip ui-text-chip${held ? ' is-held' : ''}`} data-delivery-feedback={feedback.id} role="status" aria-live="polite" aria-atomic="true">
      <b>+¥{feedback.income}</b>
      <span>{t(feedback.quality >= 90 ? 'feedback.perfect' : feedback.quality >= 75 ? 'feedback.great' : 'feedback.okay')}</span>
    </aside>
  )
}
