import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from './Hero'
import { WebField } from './WebField'
import { DeadlineBanner } from './deadline'
import { GuildLinks } from './Home'
import { ProfileCard } from './StyleKit'
import { normEquip } from './styleCatalog'
import { useSiteText } from './siteText'
import { useScrollFx, useSmoothWheel } from './smooth'

const SAMPLES = [
  { p: { id: 's1', username: 'aria', display_name: 'Aria', glory: 48210, rank: 1, badges: 6 }, e: { card: 'cd_gold', frame: 'fr_royal', namefx: 'nm_royal', backdrop: 'bd_gold', aura: 'au_sparkle', title: 'tt_legend', status: 'Golden Profile' } },
  { p: { id: 's2', username: 'kai', display_name: 'Kai', glory: 22960, rank: 7, badges: 3 }, e: { card: 'cd_obsidian', frame: 'fr_ember', namefx: 'nm_ember', backdrop: 'bd_ember', aura: 'au_embers', title: 'tt_champion', status: 'Video backdrops too' } },
  { p: { id: 's3', username: 'nova', display_name: 'Nova', glory: 9310, rank: 21, badges: 2 }, e: { card: 'cd_ice', frame: 'fr_aurora', namefx: 'nm_frost', backdrop: 'bd_aurora', aura: 'au_snow', title: 'tt_regular', status: 'Earned by quests' } },
]
const ICON = ['🏆', '🎨', '💬']

// Public visitors page: spider-web hero, 3 short tiles, profile showcase, 3 steps, quick FAQ, join.
export function Welcome() {
  const { t, list, pairs } = useSiteText(); const root = useRef<HTMLDivElement>(null)
  const [fire, setFire] = useState(false); const [ready, setReady] = useState(false)
  const onFire = useCallback((v: boolean) => setFire(v), []); const onReady = useCallback((v: boolean) => setReady(v), [])
  useSmoothWheel(true); useScrollFx(root, [])
  const strip = t('marquee').split('·').map(s => s.trim()).filter(Boolean)
  const showText = t('showcase.text')
  return (
    <div className="welcome lp" ref={root}>
      <WebField play={ready} fire={fire} />
      <Hero onFire={onFire} onReady={onReady} />
      <div className="lp-strip" aria-hidden="true"><div>{[0, 1].map(k => <span key={k}>{strip.map((s, i) => <b key={i}>{s}<i>✦</i></b>)}</span>)}</div></div>

      <section className="lp-sec" id="why"><div className="lp-in">
        <p className="lp-k" data-rv>{t('why.kicker')}</p>
        <h2 className="lp-h2" data-rv>{t('why.lead')}</h2>
        <div className="w-tiles">{pairs('why.items').map(([h, p], i) => {
          const m = h.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u)
          return <div className="w-tile" key={h} data-rv style={{ ['--d' as any]: i * 90 + 'ms' }}><span aria-hidden="true">{m ? m[1] : ICON[i % 3]}</span><div><h3>{m ? m[2] : h}</h3><p>{p}</p></div></div>
        })}</div>
      </div></section>

      <section className="lp-sec" aria-label="Profile styles"><div className="lp-in">
        <p className="lp-k" data-rv>{t('showcase.kicker')}</p><h2 className="lp-h2" data-rv>{t('showcase.title')}</h2>
        {showText && <p className="lp-p" data-rv>{showText}</p>}
        <div className="w-cards" data-rv>{SAMPLES.map(s => <ProfileCard key={s.p.id} p={s.p} equip={normEquip(s.e as any)} />)}</div>
      </div></section>

      <section className="lp-sec"><div className="lp-in">
        <p className="lp-k" data-rv>{t('steps.kicker')}</p><h2 className="lp-h2" data-rv>{t('steps.title')}</h2>
        <ol className="w-steps3">{list('steps.items').map((s, i) => <li key={s} data-rv style={{ ['--d' as any]: i * 70 + 'ms' }}><i>{i + 1}</i><span>{s}</span></li>)}</ol>
        <div className="mt-5" data-rv><DeadlineBanner /></div>
      </div></section>

      <section id="join" className="lp-sec lp-join"><div className="lp-in lp-narrow text-center">
        <h2 className="lp-h2" data-rv>{t('join.title')}</h2><p className="lp-p mx-auto" data-rv>{t('join.text')}</p>
        <div className="my-5" data-rv><GuildLinks /></div>
        <Link to="/login" className="lp-btn mx-auto" data-rv>{t('hero.cta2')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg></Link>
        <div className="lp-faq text-left" style={{ marginTop: '2.2rem' }}>{pairs('faq.items').map(([q, a]) => <details key={q} data-rv><summary>{q}</summary><p>{a}</p></details>)}</div>
        <footer className="foot">{t('footer')}</footer>
      </div></section>
    </div>)
}
