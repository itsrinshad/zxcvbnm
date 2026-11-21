import { useEffect, useState } from 'react'

// Weekly glory deadline: every Sunday at 11:59 PM India time (IST = UTC+5:30, no daylight saving).
const IST = 5.5 * 3600e3
export function nextDeadline(now = Date.now()): number {
  const ist = new Date(now + IST)                              // read the IST wall clock through the UTC fields
  const dow = ist.getUTCDay()                                  // 0 = Sunday
  let t = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 23, 59, 0) - IST
  t += ((7 - dow) % 7) * 86400e3
  if (t <= now) t += 7 * 86400e3                               // today's deadline already passed -> next Sunday
  return t
}
export const DEADLINE_TEXT = 'Sunday 11:59 PM IST'
export function useCountdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = window.setInterval(() => { if (document.visibilityState === 'visible') setNow(Date.now()) }, 1000); return () => window.clearInterval(t) }, [])
  const ms = Math.max(0, nextDeadline(now) - now); const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60, ms, at: new Date(nextDeadline(now)) }
}
export function DeadlineBanner({ compact }: { compact?: boolean }) {
  const c = useCountdown(); const p = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="glass p-3 text-center" role="timer" aria-label={`Weekly glory deadline ${DEADLINE_TEXT}`}>
      <div className="text-xs text-gray-400">⏰ Weekly glory deadline</div>
      <b className="text-amber-300">{DEADLINE_TEXT}</b>
      <div className={'font-mono ' + (compact ? 'text-lg' : 'text-2xl') + ' mt-1'} aria-live="off">{c.d}d {p(c.h)}h {p(c.m)}m {p(c.s)}s</div>
      {!compact && <div className="text-[11px] text-gray-500 mt-1">Your time: {c.at.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })}. After the deadline the week closes and a new one starts.</div>}
    </div>
  )
}
