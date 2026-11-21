import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { createAmbient } from './ambient'
import { onIntroDone } from './introSignal'
import { useSiteText } from './siteText'

/** First screen of the visitors page. The spider-web background behind it is <WebField /> (mounted by Welcome). `onFire` flares up the web. */
export function Hero({ onFire, onReady }: { onFire: (v: boolean) => void; onReady: (v: boolean) => void }) {
  const { t } = useSiteText(); const root = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false); const [sound, setSound] = useState(false)
  const amb = useRef<ReturnType<typeof createAmbient> | null>(null)
  useEffect(() => onIntroDone(() => { setReady(true); onReady(true) }), [onReady])
  useEffect(() => () => { amb.current?.dispose() }, [])
  const head = t('hero.headline'); const cap = t('hero.caption').split('\n')

  useLayoutEffect(() => {
    const el = root.current; if (!el) return
    const words = el.querySelectorAll('.lp-w'); const soft = el.querySelectorAll('.lp-soft')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (!ready) { gsap.set(words, { yPercent: 115 }); gsap.set(soft, { opacity: 0, y: 18 }); return }
      if (reduce) { gsap.set(words, { yPercent: 0 }); gsap.set(soft, { opacity: 1, y: 0 }); return }
      gsap.timeline({ defaults: { ease: 'power3.out' } }).to(words, { yPercent: 0, duration: 1.15, stagger: 0.08 }, 0.35).to(soft, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.9)
    }, el)
    return () => ctx.revert()
  }, [ready, head])

  const toggleSound = () => { if (!amb.current) amb.current = createAmbient(); const n = !sound; amb.current.setOn(n); setSound(n) }
  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <header ref={root} className="lp-track">
      <div className="lp-stage">
        <div className={'lp-ui' + (ready ? ' on' : '')}>
          <div className="lp-top">
            <Link to="/" className="lp-logo" aria-label="SYMBIOTES"><img src="/intro/emblem.webp" alt="" width={30} height={28} />SYMBIOTES</Link>
            <nav className="lp-nav" aria-label="Main"><a href="#why" onClick={go('why')}>Why join</a><Link to="/rules">Rules</Link><a href="#join" onClick={go('join')}>Join</a><Link to="/login" className="lp-pill">Login</Link></nav>
          </div>
          <div className="lp-hero">
            <div className="lp-spider" aria-hidden="true"><img src="/intro/spider.webp" alt="" width={720} height={679} /></div>
            <p className="lp-eyebrow lp-soft">{t('hero.eyebrow')}</p>
            <h1 className="lp-h1" aria-label={head}>{head.split(' ').map((w, i) => <Fragment key={i}><span className="lp-mask" aria-hidden="true"><span className="lp-w">{w}</span></span>{' '}</Fragment>)}</h1>
            <p className="lp-cap lp-soft">{cap.map((l, i) => <Fragment key={i}>{l}{i < cap.length - 1 && <br />}</Fragment>)}</p>
            <div className="lp-ctas lp-soft">
              <a href="#join" className="lp-btn" onClick={go('join')} onPointerEnter={() => onFire(true)} onPointerLeave={() => onFire(false)} onFocus={() => onFire(true)} onBlur={() => onFire(false)} onTouchStart={() => onFire(true)} onTouchEnd={() => window.setTimeout(() => onFire(false), 900)}>{t('hero.cta1')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg></a>
              <Link to="/login" className="lp-btn lp-btn-ghost">{t('hero.cta2')}</Link>
            </div>
          </div>
          <div className="lp-corner"><span>Scroll</span><i /><button className="lp-sound" aria-pressed={sound} aria-label={sound ? 'Turn ambient sound off' : 'Turn ambient sound on'} onClick={toggleSound}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" /><path className="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /><path className="x" d="m16 10 4 4m0-4-4 4" /></svg></button></div>
        </div>
      </div>
    </header>)
}
export default Hero
