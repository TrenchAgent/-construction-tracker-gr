import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Animates a number from its previous value to `target` over `durationMs`,
// easing out — used for the dashboard hero's big figures so they count up
// on load instead of just appearing. Not actually CSS: there's no CSS
// mechanism that can interpolate an arbitrary Intl-formatted currency
// string (€ sign, Greek thousands/decimal separators), so this is a small
// hand-written requestAnimationFrame loop instead — no animation library
// added, but worth being precise that this one piece isn't literally CSS
// the way the rest of this pass's motion (fades, the progress bar fill,
// button press states) is.
export function useCountUp(target, durationMs = 400) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const prevTargetRef = useRef(prefersReducedMotion() ? target : 0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      prevTargetRef.current = target
      return
    }
    const start = prevTargetRef.current
    const delta = target - start
    if (delta === 0) return
    const startTime = performance.now()
    let raf
    function tick(now) {
      const t = Math.min(1, (now - startTime) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setValue(start + delta * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        prevTargetRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}
