import { useEffect, type RefObject } from 'react'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
/** Silky inertial mouse-wheel scrolling for desktop. Phones and trackpads keep their own native momentum scroll. */
export function useSmoothWheel(on = true) {
  useEffect(() => {
    if (!on || reduced() || matchMedia('(pointer: coarse)').matches) return
    document.documentElement.classList.add('lp-on')
    let target = scrollY, cur = scrollY, raf = 0, active = false
    const max = () => document.documentElement.scrollHeight - innerHeight
    const tick = () => { cur += (target - cur) * 0.11; if (Math.abs(target - cur) < 0.4) { cur = target; active = false } scrollTo(0, cur); if (active) raf = requestAnimationFrame(tick) }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || (e.target as HTMLElement | null)?.closest?.('textarea,[data-native-scroll]')) return
      e.preventDefault(); if (!active) { target = cur = scrollY }
      target = Math.max(0, Math.min(max(), target + e.deltaY * (e.deltaMode === 1 ? 34 : 1)))
      if (!active) { active = true; raf = requestAnimationFrame(tick) }
    }
    const onScroll = () => { if (!active) { target = cur = scrollY } }
    addEventListener('wheel', onWheel, { passive: false }); addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(raf); removeEventListener('wheel', onWheel); removeEventListener('scroll', onScroll); document.documentElement.classList.remove('lp-on') }
  }, [on])
}

/** Fades sections in as they come into view, and keeps --p (0..1, progress through the first screen) up to date for the hero. */
export function useScrollFx(root: RefObject<HTMLElement>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current; if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-rv]'))
    if (reduced() || !('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('rv-in')); }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    items.forEach(i => { if (!i.classList.contains('rv-in')) io.observe(i) })
    let raf = 0
    const upd = () => { raf = 0; const h = (el.querySelector('.lp-track') as HTMLElement | null)?.offsetHeight ?? innerHeight * 1.8; const p = Math.min(1, Math.max(0, scrollY / Math.max(1, h - innerHeight))); el.style.setProperty('--p', p.toFixed(4)) }
    const on = () => { if (!raf) raf = requestAnimationFrame(upd) }
    upd(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('scroll', on); removeEventListener('resize', on) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
