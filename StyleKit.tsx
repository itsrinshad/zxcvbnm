// Drawing pieces for profile styles: framed avatar, styled name, title pill, backdrop (image / video / CSS), aura and the profile card.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as KE, type ReactNode } from 'react'
import { DEFAULT_EQUIP, Equip, Item, RARITY, itemOf, nameOfTitle } from './styleCatalog'
import { useCustomItems, useEquip } from './styleStore'
import { getPrefs } from './prefs'

const calm = () => { try { return getPrefs().lite || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches } catch { return false } }
const v = (o: Record<string, string | number>) => o as CSSProperties

const reduced = () => { try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches } catch { return false } }
/** Looping muted video that really plays on phones: sets the muted flag before play(), starts only while on screen,
 *  restarts after a stall or when the tab returns, and falls back to the still picture if the file cannot be decoded. */
function BgVideo({ src, poster, className }: { src: string; poster?: string | null; className: string }) {
  const ref = useRef<HTMLVideoElement>(null); const [bad, setBad] = useState(false)
  useEffect(() => {
    const v = ref.current; if (!v) return
    v.muted = true; v.defaultMuted = true; v.loop = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '')
    let stall = 0; let on = true
    const play = () => { if (!on || document.hidden) return; const p = v.play(); if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked: first touch retries */ }) }
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) play(); else v.pause() }, { threshold: 0.1 }); io.observe(v)
    const waiting = () => { window.clearTimeout(stall); stall = window.setTimeout(() => { if (v.readyState < 3 && on) { v.load(); play(); stall = window.setTimeout(() => { if (v.readyState < 3) setBad(true) }, 6000) } }, 5000) }
    const ok = () => window.clearTimeout(stall)
    const vis = () => { if (!document.hidden) play() }
    const kick = () => { if (v.paused) play() }
    v.addEventListener('canplay', play); v.addEventListener('loadeddata', play); v.addEventListener('waiting', waiting); v.addEventListener('stalled', waiting); v.addEventListener('playing', ok); v.addEventListener('pause', () => { if (on && !document.hidden && !v.ended) window.setTimeout(play, 400) })
    document.addEventListener('visibilitychange', vis); window.addEventListener('touchstart', kick, { passive: true }); window.addEventListener('pointerdown', kick, { passive: true })
    play()
    return () => { io.disconnect(); window.clearTimeout(stall); document.removeEventListener('visibilitychange', vis); window.removeEventListener('touchstart', kick); window.removeEventListener('pointerdown', kick) }
  }, [src])
  if (bad) return poster ? <img className={className} src={poster} alt="" /> : <div className="bd-css bd_night" />
  return <video ref={ref} className={className} src={src} poster={poster ?? undefined} autoPlay muted loop playsInline preload="auto" disablePictureInPicture onError={() => setBad(true)} />
}

export function StyledAvatar({ uid, url, name, size = 44, equip, onClick, className = '' }: { uid?: string | null; url?: string | null; name?: string | null; size?: number; equip?: Equip; onClick?: () => void; className?: string }) {
  const own = useEquip(uid); const e = equip ?? own
  return (
    <span className={'fr ' + e.frame + ' ' + className} style={v({ width: size, height: size, '--s': size + 'px', cursor: onClick ? 'pointer' : 'default' })} onClick={onClick}>
      <span className="fr-in">{url ? <img src={url} alt="" width={size} height={size} loading="lazy" /> : <b style={{ fontSize: size * 0.42 }}>{(name || '?').slice(0, 1).toUpperCase()}</b>}</span>
    </span>)
}
export function StyledName({ uid, name, equip, className = '' }: { uid?: string | null; name: string; equip?: Equip; className?: string }) {
  const own = useEquip(uid); const e = equip ?? own
  return <span className={'nm ' + e.namefx + ' ' + className}>{name}</span>
}
export function TitlePill({ code }: { code: string }) {
  const custom = useCustomItems(); const t = nameOfTitle(code, custom); if (!t) return null
  const it = itemOf(code, custom)
  return <span className="tt" style={v({ '--rc': RARITY[it?.rarity ?? 'common'].color })}>{t}</span>
}
export const Rarity = ({ r }: { r: Item['rarity'] }) => <span className="rar" style={v({ '--rc': RARITY[r].color })}>{RARITY[r].label}</span>

/** Banner behind a profile. Images and CSS backdrops are cheap; video backdrops only play when `play` is true (and the visitor is not in lite / reduced-motion mode). */
export function Backdrop({ code, play, big, media, poster, kind }: { code: string; play?: boolean; big?: boolean; media?: string | null; poster?: string | null; kind?: string | null }) {
  const custom = useCustomItems(); const it = itemOf(code, custom)
  if (code === 'bd_myvideo' || code === 'bd_myimage') {   // the member's own uploaded video or picture
    if (!media) return <div className="bd-css bd_myvideo" />
    if (kind === 'image' || code === 'bd_myimage') return <img className="bd-vid" src={media} alt="" loading="lazy" />
    // a big card (profile page, studio preview) always plays; small cards only play when asked. Reduced-motion users get the still picture.
    const still = !play || reduced() || (calm() && !big)
    if (still) return poster ? <img className="bd-vid" src={poster} alt="" loading="lazy" /> : <div className="bd-css bd_myvideo" />
    return <BgVideo src={media} poster={poster} className="bd-vid" />
  }
  if (it?.custom && it.media) {
    if (it.kind === 'video') {
      if (!play || reduced() || (calm() && !big)) return it.poster ? <img className="bd-media" src={it.poster} alt="" loading="lazy" /> : <div className="bd-css bd_night" />
      return <BgVideo src={it.media} poster={it.poster} className="bd-media" />
    }
    return <img className="bd-media" src={it.media} alt="" loading="lazy" />
  }
  if (it?.img) return <img className="bd-media" src={it.img + (big ? '.jpg' : '_t.jpg')} alt="" loading="lazy" />
  return <div className={'bd-css ' + (it ? code : 'bd_night')} />
}
export function Aura({ code }: { code: string }) {
  if (!code || code === 'au_none') return null
  return <div className={'aura ' + code} aria-hidden="true">{code === 'au_violet' ? null : Array.from({ length: 14 }, (_, i) => <i key={i} style={v({ '--i': i })} />)}</div>
}

export type PlayerLite = { id: string; username: string; display_name?: string | null; avatar_url?: string | null; role?: string; ff_ign?: string | null; ff_rank?: string | null; player_level?: number | null; bio?: string | null; glory?: number | null; rank?: number | null; badges?: number | null }

/** The profile card. size "sm" is used in the Players grid, "lg" on the profile page, in the studio preview and in the player sheet. */
export function ProfileCard({ p, equip, size = 'sm', play = false, children, onClick }: { p: PlayerLite; equip: Equip; size?: 'sm' | 'lg'; play?: boolean; children?: ReactNode; onClick?: () => void }) {
  const name = p.display_name || p.username
  const click = onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: KE) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }, 'aria-label': `Open ${name}` } : {}
  return (
    <article className={`pc pc-${size} ${equip.card}${onClick ? ' pc-tap' : ''}`} {...click}>
      <div className="pc-ban"><Backdrop code={equip.backdrop} play={play} big={size === 'lg'} media={equip.bg_media} poster={equip.bg_poster} kind={equip.bg_kind} /><div className="pc-shade" /><Aura code={equip.aura} /></div>
      <div className="pc-body">
        <StyledAvatar uid={p.id} url={p.avatar_url} name={name} size={size === 'lg' ? 96 : 68} equip={equip} />
        <div className="pc-id">
          <StyledName name={name} equip={equip} className="pc-name" />
          <TitlePill code={equip.title} />
        </div>
        <small className="pc-user">@{p.username}{p.role && p.role !== 'member' ? ' · ' + p.role.replace('_', ' ') : ''}</small>
        {equip.status && <p className="pc-status">“{equip.status}”</p>}
        <dl className="pc-stats">
          <div><dt>Glory</dt><dd>{p.glory != null ? Number(p.glory).toLocaleString() : '—'}</dd></div>
          <div><dt>Rank</dt><dd>{p.rank ? '#' + p.rank : '—'}</dd></div>
          <div><dt>Badges</dt><dd>{p.badges ?? 0}</dd></div>
        </dl>
        {children}
      </div>
    </article>)
}

/** Small preview of one catalogue item (used in the studio, quests and collections). */
export function ItemPreview({ item, play }: { item: Item; play?: boolean }) {
  const base = { ...DEFAULT_EQUIP }
  switch (item.slot) {
    case 'frame': return <StyledAvatar size={54} name="S" equip={{ ...base, frame: item.code }} />
    case 'namefx': return <span className={'nm nm-big ' + item.code}>Symbiote</span>
    case 'backdrop': return <div className="tile-bd"><Backdrop code={item.code} play={play} /></div>
    case 'aura': return <div className="tile-au"><Aura code={item.code} /><i>✦</i></div>
    case 'card': return <div className={'tile-cd ' + item.code}><span /><span /></div>
    default: return <TitlePill code={item.code} />
  }
}
