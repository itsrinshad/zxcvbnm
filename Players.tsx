import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Equip, Item, SLOTS, flex, itemOf, normEquip, rarityRank } from './styleCatalog'
import { primeStyles, useCustomItems } from './styleStore'
import { ItemPreview, PlayerLite, ProfileCard, Rarity } from './StyleKit'

type Player = PlayerLite & { style: Partial<Equip>; owned: string[] }

// Every player's look, side by side. Tap a card to see everything they have equipped and collected.
export function Players() {
  const [rows, setRows] = useState<Player[] | null>(null); const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [sort, setSort] = useState('style'); const [only, setOnly] = useState('all'); const [open, setOpen] = useState<string | null>(null)
  const custom = useCustomItems()
  useEffect(() => { supabase.rpc('style_players').then(r => { if (r.error) setErr(r.error.message + ' — an admin needs to run SYMBIOTES_PHASE6_STYLE.sql in Supabase.'); else { const l = (r.data ?? []) as Player[]; setRows(l); primeStyles(l) } }) }, [])
  const list = useMemo(() => {
    const eq = (p: Player) => normEquip(p.style)
    const gold = (p: Player) => { const e = eq(p); return e.card === 'cd_gold' || ['fr_gold', 'fr_royal'].includes(e.frame) || ['nm_gold', 'nm_royal'].includes(e.namefx) || e.backdrop === 'bd_gold' }
    const video = (p: Player) => itemOf(eq(p).backdrop, custom)?.kind === 'video'
    return (rows ?? []).filter(p => (p.username + (p.display_name ?? '') + (p.ff_ign ?? '')).toLowerCase().includes(q.toLowerCase()) && (only === 'all' || (only === 'gold' && gold(p)) || (only === 'video' && video(p))))
      .sort((a, b) => sort === 'name' ? (a.display_name || a.username).localeCompare(b.display_name || b.username) : sort === 'rank' ? (a.rank ?? 9999) - (b.rank ?? 9999) : flex(eq(b), custom) - flex(eq(a), custom) || (a.rank ?? 9999) - (b.rank ?? 9999))
  }, [rows, q, sort, only, custom])
  const idx = open ? list.findIndex(p => p.id === open) : -1
  return (
    <div className="space-y-4">
      <div><h1 className="h1">Players</h1><p className="text-sm text-gray-400">Every member's profile style. Tap a card to see all of their customisations.</p></div>
      <div className="toolbar"><input className="sym-inp !mb-0" placeholder="🔍 Find a player" value={q} onChange={e => setQ(e.target.value)} aria-label="Find a player" />
        <select className="sym-inp !mb-0" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="style">Fanciest first</option><option value="rank">Best rank</option><option value="name">Name A–Z</option></select>
        <select className="sym-inp !mb-0" value={only} onChange={e => setOnly(e.target.value)} aria-label="Filter"><option value="all">Everyone</option><option value="gold">Golden looks</option><option value="video">Video backdrops</option></select></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      {!rows && !err && <p className="text-center text-gray-400 animate-pulse">Loading players…</p>}
      <div className="players">{list.map(p => <ProfileCard key={p.id} p={p} equip={normEquip(p.style)} onClick={() => setOpen(p.id)} />)}</div>
      {rows && !list.length && <p className="text-center text-gray-400 text-sm">No players match.</p>}
      {idx >= 0 && <PlayerSheet list={list} index={idx} onIndex={i => setOpen(list[i].id)} onClose={() => setOpen(null)} />}
    </div>)
}

function PlayerSheet({ list, index, onIndex, onClose }: { list: Player[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { session } = useAuth(); const nav = useNavigate(); const custom = useCustomItems(); const p = list[index]; const e = normEquip(p.style); const [x0, setX0] = useState<number | null>(null)
  const go = (d: number) => onIndex((index + d + list.length) % list.length)
  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); if (ev.key === 'ArrowRight') go(1); if (ev.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  })
  const owned = useMemo(() => p.owned.map(c => itemOf(c, custom)).filter((i): i is Item => !!i), [p, custom])
  const dm = async () => { const r = await supabase.rpc('get_or_create_dm', { other: p.id }); if (!r.error) nav('/chat?c=' + r.data) }
  const name = p.display_name || p.username
  return (
    <div className="sheet-bg" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${name}'s profile style`} onClick={ev => ev.stopPropagation()}
        onTouchStart={ev => setX0(ev.touches[0].clientX)} onTouchEnd={ev => { if (x0 !== null && Math.abs(ev.changedTouches[0].clientX - x0) > 70) go(ev.changedTouches[0].clientX < x0 ? 1 : -1); setX0(null) }}>
        <div className="sheet-bar"><button className="icon-btn" onClick={() => go(-1)} aria-label="Previous player">‹</button><span className="text-xs text-gray-400">{index + 1} / {list.length}</span><button className="icon-btn" onClick={() => go(1)} aria-label="Next player">›</button><span className="ml-auto" /><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <ProfileCard key={p.id} p={p} equip={e} size="lg" play>
          <div className="flex gap-2 flex-wrap mt-3"><Link to={`/u/${p.username}`} className="sym-btn" onClick={onClose}>Open profile</Link>{p.id !== session?.user.id && <button className="sym-btn" onClick={dm}>💬 Message</button>}</div>
        </ProfileCard>
        <h3 className="h2 mt-4">Wearing now</h3>
        <ul className="wear">{SLOTS.map(s => { const it = itemOf(e[s.id], custom); return <li key={s.id}><span className="text-xs text-gray-400">{s.label}</span><b className="truncate">{it?.name ?? '—'}</b>{it && !it.free && <Rarity r={it.rarity} />}</li> })}</ul>
        <h3 className="h2 mt-4">Collection <small className="text-gray-500 font-normal">({owned.length} earned)</small></h3>
        {!owned.length ? <p className="text-sm text-gray-400">Nothing earned yet. Quests and admin gifts unlock styles.</p> : SLOTS.map(s => { const l = owned.filter(i => i.slot === s.id).sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity)); return l.length ? (
          <div key={s.id} className="mb-3"><p className="text-xs text-gray-400 mb-1">{s.label}</p><div className="mini-tiles">{l.map(i => <div key={i.code} className="mini" title={i.name}><span className="mini-pv"><ItemPreview item={i} /></span><small className="truncate">{i.name}</small></div>)}</div></div>) : null })}
      </div>
    </div>)
}
