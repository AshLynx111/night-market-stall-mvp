const PRECISE_POINTER_DRAG_THRESHOLD = 4
const TOUCH_DRAG_THRESHOLD = 10

export function pointerDragThreshold(pointerType: string) {
  return pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD : PRECISE_POINTER_DRAG_THRESHOLD
}

export function isIntentionalPointerDrag(pointerType: string, deltaX: number, deltaY: number) {
  return Math.hypot(deltaX, deltaY) > pointerDragThreshold(pointerType)
}
