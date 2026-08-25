export interface DeliveryFeedbackValue { id: number; income: number; quality: number }
import { useI18n } from '../../i18n/I18nProvider'

export function qualityLabel(quality: number): '完美' | '很好' | '可以' {
  if (quality >= 90) return '完美'
  if (quality >= 75) return '很好'
  return '可以'
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
