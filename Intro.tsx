import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Opening signature of the website. Shown on every visit, with a Skip button.
// Admin uploads a video (Admin > Starting animation). Without one, a calm silent SYMBIOTES title card plays.
// Full screen on phone and PC. The video tries to start WITH sound; if the browser blocks that, it starts muted with a "Tap for sound" button (and the first tap anywhere turns sound on). Visitors can mute or skip at any time.
export type IntroItem = { id: string; name: string; video: string; poster?: string; w?: number; h?: number; fit?: 'cover' | 'contain' }
const TITLE = 'SYMBIOTES'.split('')
const useViewport = () => {
  const [s, set] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => { const f = () => set({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', f); window.addEventListener('orientationchange', f); return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f) } }, [])
  return s
}

export default function Intro({ onDone, item }: { onDone: () => void; item?: IntroItem | null }) {
  const reduced = useMemo(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !!(navigator as any).connection?.saveData, [])
  const [vidOk, setVidOk] = useState(!!item && !reduced); const [dim, setDim] = useState({ w: item?.w ?? 0, h: item?.h ?? 0 })
  const [muted, setMuted] = useState(false); const [blocked, setBlocked] = useState(false); const [leaving, setLeaving] = useState(false); const [prog, setProg] = useState(0); const [playing, setPlaying] = useState(false)
  const vid = useRef<HTMLVideoElement>(null); const done = useRef(false); const skip = useRef<HTMLButtonElement>(null); const vp = useViewport()

  // try to play with sound; blocked by the browser -> play muted and ask for one tap
  const tryPlay = useCallback(() => {
    const v = vid.current; if (!v) return
    v.muted = false; const p = v.play()
    if (p && typeof p.catch === 'function') p.catch(() => { v.muted = true; setMuted(true); setBlocked(true); v.play().catch(() => setVidOk(false)) })
  }, [])
  const unmute = useCallback(() => { const v = vid.current; if (!v) return; v.muted = false; setMuted(false); setBlocked(false); v.play().catch(() => {}) }, [])
  useEffect(() => { if (!blocked) return; const f = (e: Event) => { if ((e.target as HTMLElement | null)?.closest?.('.in-skip')) return; unmute() }; window.addEventListener('pointerdown', f, { once: true }); return () => window.removeEventListener('pointerdown', f) }, [blocked, unmute])
  useEffect(() => { if (vidOk) tryPlay() }, [vidOk, tryPlay])
  const finish = useCallback(() => { if (done.current) return; done.current = true; setLeaving(true); window.setTimeout(onDone, 550) }, [onDone])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish() } }
    window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; skip.current?.focus({ preventScroll: true })
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [finish])
  // title card timing (also the fallback if the video is slow or broken)
  useEffect(() => { if (vidOk) return; const t = window.setTimeout(finish, reduced ? 2200 : 3600); return () => clearTimeout(t) }, [vidOk, reduced, finish])
  // video that never starts within 8 s is replaced by the title card
  useEffect(() => { if (!vidOk || playing) return; const t = window.setTimeout(() => setVidOk(false), 8000); return () => clearTimeout(t) }, [vidOk, playing])

  // fit the video to the screen: similar shape -> fill (cover); very different shape (e.g. portrait on a laptop) -> whole picture with a soft blurred fill (contain)
  const r = dim.w && dim.h ? dim.w / dim.h : 16 / 9; const vr = vp.w / vp.h
  const contain = vidOk && item?.fit === 'contain' && Math.abs(Math.log(r / vr)) > Math.log(1.05)
  const bw = contain ? Math.round(r > vr ? vp.w : vp.h * r) : vp.w; const bh = contain ? Math.round(r > vr ? vp.w / r : vp.h) : vp.h
  const unit = Math.max(280, Math.min(bw, bh * 1.3))   // text scales with the picture, not the window

  return (
    <div className={'in-root' + (leaving ? ' leaving' : '')} role="dialog" aria-modal="true" aria-label="SYMBIOTES opening" style={{ ['--bw' as any]: bw + 'px', ['--bh' as any]: bh + 'px', ['--u' as any]: unit / 100 + 'px' }}>
      {vidOk ? (<>
        {contain && (item?.poster ? <img className="in-amb" src={item.poster} alt="" /> : <i className="in-amb" />)}
        <video ref={vid} className={'in-vid ' + (contain ? 'contain' : 'cover')} src={item!.video} poster={item!.poster} playsInline preload="auto" autoPlay
          onLoadedMetadata={e => { const v = e.currentTarget; if (v.videoWidth) setDim({ w: v.videoWidth, h: v.videoHeight }) }}
          onPlaying={() => setPlaying(true)} onLoadedData={tryPlay} onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProg(v.currentTime / v.duration) }}
          onEnded={finish} onError={() => setVidOk(false)} />
      </>) : (
        <div className="in-card">
          <img className="in-emb" src="/intro/emblem.webp" alt="" width={720} height={679} />
          <h1 className="in-word" aria-label="SYMBIOTES">{TITLE.map((l, i) => <span key={i} style={{ animationDelay: `${0.5 + i * 0.07}s` }}>{l}</span>)}</h1>
          <p className="in-tag">Different players. One united team.</p>
        </div>)}
      <div className="in-ui" style={{ width: bw, height: bh }}>
        {vidOk && !playing && <span className="in-load" aria-hidden="true" />}
        <div className="in-bar">
          {vidOk && blocked && <button className="in-tap" onClick={unmute}>🔊 Tap for sound</button>}
          {vidOk && <button className="in-mini" onClick={() => { const n = !muted; setMuted(n); setBlocked(false); if (vid.current) vid.current.muted = n }} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>}
          <button ref={skip} className="in-mini in-skip" onClick={finish}>Skip intro <span aria-hidden="true">→</span></button>
        </div>
        {vidOk && <i className="in-prog" style={{ transform: `scaleX(${prog})` }} aria-hidden="true" />}
      </div>
    </div>)
}
