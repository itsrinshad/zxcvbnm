// The landing hero waits for the opening animation (Intro) to finish before it plays.
// IntroGate calls markIntroDone() when the intro ends (or at once when it is skipped with ?nointro).
const FLAG = '__symIntroDone'
export const markIntroDone = () => { (window as any)[FLAG] = true; window.dispatchEvent(new Event('sym-intro-done')) }
export function onIntroDone(fn: () => void) {
  if ((window as any)[FLAG]) { fn(); return () => {} }
  window.addEventListener('sym-intro-done', fn, { once: true })
  return () => window.removeEventListener('sym-intro-done', fn)
}
