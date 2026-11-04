export function shouldScrollToTop({ navigationType, hash, previousLocation, nextLocation }) {
  if (!previousLocation || previousLocation === nextLocation) return false
  if (navigationType === 'POP' || hash) return false
  return true
}
