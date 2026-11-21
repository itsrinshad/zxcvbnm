import { Suspense, lazy, useEffect, useState } from 'react'
import { supabase } from './lib'
import type { IntroItem } from './Intro'
import { markIntroDone } from './introSignal'
const Intro = lazy(() => import('./Intro'))

// site_settings.intro = { active: 'builtin' | <custom id>, items: IntroItem[] }. 'builtin' (or nothing uploaded) = the silent SYMBIOTES title card.
// The intro plays EVERY time the website is opened. ?nointro skips it while testing.
const wanted = () => !/[?&]nointro\b/.test(location.search)
export function IntroGate() {
  const [state, setState] = useState<'wait' | 'off' | 'on'>(wanted() ? 'wait' : 'off'); const [item, setItem] = useState<IntroItem | null>(null)
  useEffect(() => { if (state === 'off') markIntroDone() }, [state])   // intro over (or skipped): the hero may start
  useEffect(() => {
    if (state !== 'wait') return; let live = true
    const timeout = new Promise<null>(r => window.setTimeout(() => r(null), 2000))
    Promise.race([Promise.resolve(supabase.from('site_settings').select('value').eq('key', 'intro').maybeSingle()).then(r => r.data?.value ?? null).catch(() => null), timeout]).then((cfg: any) => {
      if (!live) return
      const active = cfg?.active ?? 'builtin'
      setItem((cfg?.items ?? []).find((x: IntroItem) => x.id === active) ?? null); setState('on')
    })
    return () => { live = false }
  }, [state])
  if (state === 'off') return null
  if (state === 'wait') return <div className="in-boot" />
  return <Suspense fallback={<div className="in-boot" />}><Intro item={item} onDone={() => setState('off')} /></Suspense>
}
