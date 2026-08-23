export interface DeliveryFeedbackValue { id: number; income: number; quality: number }

export function qualityLabel(quality: number): '完美' | '很好' | '可以' {
  if (quality >= 90) return '完美'
  if (quality >= 75) return '很好'
  return '可以'
}

export function DeliveryFeedback({ feedback }: { feedback: DeliveryFeedbackValue | null }) {
  if (!feedback) return null
  return (
    <aside className="delivery-feedback" data-delivery-feedback={feedback.id} role="status" aria-live="polite">
      <b>+¥{feedback.income}</b>
      <span>{qualityLabel(feedback.quality)}</span>
    </aside>
  )
}
