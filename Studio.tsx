import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { BUILTIN, DEFAULT_EQUIP, Equip, Item, SLOTS, Slot, METRICS, normEquip, rarityRank } from './styleCatalog'
import { setMyStyle, useCustomItems } from './styleStore'
import { ItemPreview, ProfileCard, Rarity } from './StyleKit'
import { SITE_BUCKET, shrinkImage, sitePublicUrl, videoInfo } from './media'

export type Task = { id: string; title: string; description: string; kind: 'auto' | 'manual'; metric: string | null; target: number; reward: string; progress: number; owned: boolean; pending: boolean; rejected: string | null }
export type Overview = { equipped: Partial<Equip>; owned: { code: string; source: 'task' | 'gift'; note: string | null; seen: boolean; at: string }[]; tasks: Task[] }
const HINT = ' — an admin needs to run SYMBIOTES_PHASE6_STYLE.sql in Supabase.'

export function useOverview() {
  const [data, setData] = useState<Overview | null>(null); const [err, setErr] = useState('')
  const load = useCallback(async () => { const r = await supabase.rpc('style_overview'); if (r.error) setErr(r.error.message + HINT); else { setErr(''); setData(r.data as Overview) } }, [])
  useEffect(() => { load() }, [load])
  return { data, err, load }
}
export const useAllItems = () => { const c = useCustomItems(); return useMemo(() => [...BUILTIN, ...c.values()], [c]) }
const unit = (m: string | null) => METRICS.find(x => x.id === m)?.unit ?? ''
const yes = (m: string | null) => ['photo', 'bio', 'game_id'].includes(m ?? '')

// ================= Style Studio: preview + pick what you own =================
export function Studio() {
  const { session, profile, isKing } = useAuth(); const uid = session!.user.id
  const { data, err, load } = useOverview(); const items = useAllItems(); const [upBusy, setUpBusy] = useState(false)
  const [draft, setDraft] = useState<Equip>(DEFAULT_EQUIP); const [slot, setSlot] = useState<Slot>('frame'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [stat, setStat] = useState<{ glory?: number; rank?: number; badges: number }>({ badges: 0 })
  useEffect(() => { if (data) { setDraft(normEquip(data.equipped)); if (data.owned.some(o => !o.seen)) supabase.rpc('style_mark_seen').then(() => {}) } }, [data])
  useEffect(() => {
    supabase.from('v_lb_lifetime').select('glory,rnk').eq('member_id', uid).maybeSingle().then(r => setStat(s => ({ ...s, glory: r.data?.glory, rank: r.data?.rnk })))
    supabase.from('member_badges').select('badge_id', { count: 'exact', head: true }).eq('member_id', uid).then(r => setStat(s => ({ ...s, badges: r.count ?? 0 })))
  }, [uid])
  const owned = useMemo(() => new Map((data?.owned ?? []).map(o => [o.code, o])), [data])
  const quest = useMemo(() => new Map((data?.tasks ?? []).map(t => [t.reward, t])), [data])
  const has = (i: Item) => isKing || !!i.free || owned.has(i.code)
  const list = items.filter(i => i.slot === slot).sort((a, b) => Number(has(b)) - Number(has(a)) || rarityRank(a.rarity) - rarityRank(b.rarity))
  const total = items.filter(i => !i.free).length; const mine = isKing ? total : items.filter(i => !i.free && owned.has(i.code)).length
  const dirty = data ? JSON.stringify(normEquip(data.equipped)) !== JSON.stringify(normEquip(draft)) : false
  const pick = (i: Item) => {
    if (!has(i)) { const q = quest.get(i.code); setMsg(q ? `🔒 Locked. Unlock it with the quest “${q.title}”.` : '🔒 Locked. This one is a gift from the admins.'); return }
    setMsg(''); setDraft(d => ({ ...d, [i.slot]: i.code }))
  }
  const save = async () => {
    if (!data) return; setBusy(true); setMsg('')
    const base = normEquip(data.equipped); const patch: Record<string, string> = {}
    ;(Object.keys(draft) as (keyof Equip)[]).forEach(k => { if ((draft[k] ?? '') !== (base[k] ?? '')) patch[k] = (draft[k] as string | null | undefined) ?? '' })
    if (!Object.keys(patch).length) { setBusy(false); return }
    const r = await supabase.rpc('style_equip', { p_patch: patch }); setBusy(false)
    if (r.error) return setMsg('❌ ' + r.error.message)
    setMyStyle(uid, r.data as Equip); setMsg('Saved ✅ Everyone can see your new look.'); load()
  }
  const MAXV = 15
  const uploadBg = async (file: File | null, want: 'image' | 'video') => {
    if (!file) return
    const isVid = /^video\/(mp4|webm)$/.test(file.type); const isImg = /^image\/(jpeg|png|webp)$/.test(file.type)
    if (want === 'video' && !isVid) return setMsg('Choose an MP4 or WebM video (H.264 MP4 works everywhere).')
    if (want === 'image' && !isImg) return setMsg('Choose a JPG, PNG or WebP picture.')
    if (isVid && file.size > MAXV * 1048576) return setMsg(`That video is ${(file.size / 1048576).toFixed(1)} MB. The maximum is ${MAXV} MB. Use a short 6–10 second loop.`)
    if (isImg && file.size > 12 * 1048576) return setMsg('That picture is over 12 MB. Pick a smaller one.')
    setUpBusy(true); setMsg('Preparing…')
    const id = Date.now().toString(36)
    let body: Blob = file; let ext = 'mp4'; let type = file.type; let poster: string | null = null
    if (isImg) { const small = await shrinkImage(file); if (!small) { setUpBusy(false); return setMsg('That picture could not be read. Try a different one.') } body = small; ext = 'jpg'; type = 'image/jpeg' }
    else {
      ext = file.type === 'video/webm' ? 'webm' : 'mp4'
      const info = await videoInfo(file)
      if (!info.w) { setUpBusy(false); return setMsg('This video format cannot play in browsers (phone HEVC/H.265 videos often cannot). Export it as MP4 (H.264) and try again.') }
      if (info.poster) { const p = await supabase.storage.from(SITE_BUCKET).upload(`profile-bg/${uid}/${id}.jpg`, info.poster, { contentType: 'image/jpeg' }); if (!p.error) poster = sitePublicUrl(`profile-bg/${uid}/${id}.jpg`) }
    }
    setMsg('Uploading…')
    const up = await supabase.storage.from(SITE_BUCKET).upload(`profile-bg/${uid}/${id}.${ext}`, body, { contentType: type })
    if (up.error) { setUpBusy(false); return setMsg('❌ Upload failed: ' + up.error.message) }
    setDraft(d => ({ ...d, bg_media: sitePublicUrl(`profile-bg/${uid}/${id}.${ext}`), bg_poster: isImg ? null : poster, bg_kind: isImg ? 'image' : 'video' }))
    setUpBusy(false); setMsg('Ready ✅ Press “Save my look” to show it on your profile.')
  }
  const me = { id: uid, username: profile?.username ?? 'you', display_name: profile?.display_name, avatar_url: profile?.avatar_url, role: profile?.role, glory: stat.glory, rank: stat.rank, badges: stat.badges }
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap"><div><h1 className="h1">Style Studio</h1><p className="text-sm text-gray-400">Make your profile yours. Everything you pick is shown to every member.</p></div><span className="ml-auto" /><Link to="/quests" className="sym-btn">🏆 Earn more</Link></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      <div className="studio">
        <div className="studio-prev"><ProfileCard p={me} equip={draft} size="lg" play />
          <label className="block mt-3 text-xs text-gray-400">Status line (shown under your name)<input className="sym-inp !mt-1" maxLength={60} placeholder="e.g. Grinding to Heroic" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} /></label>
          {(draft.backdrop === 'bd_myvideo' || draft.backdrop === 'bd_myimage') && <div className="glass p-3 mt-3 text-sm"><b>{draft.backdrop === 'bd_myvideo' ? '🎞 Your own backdrop' : '🖼 Your own picture backdrop'}</b>
            <p className="text-xs text-gray-400 mb-2">{draft.backdrop === 'bd_myvideo' ? `Upload a picture, or a short MP4/WebM loop (up to ${MAXV} MB, H.264). Wide 16:9 looks best.` : 'Upload any picture. We shrink it automatically so it loads fast. Wide 16:9 looks best.'}</p>
            <div className={draft.backdrop === 'bd_myvideo' ? 'up-pick' : ''}>
              <label className="upload-box block">{upBusy ? 'Working…' : draft.bg_media && draft.bg_kind === 'image' ? '🔁 Replace picture' : '🖼 Upload picture'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={upBusy} onChange={e => { uploadBg(e.target.files?.[0] ?? null, 'image'); e.target.value = '' }} /></label>
              {draft.backdrop === 'bd_myvideo' && <label className="upload-box block">{upBusy ? 'Working…' : draft.bg_media && draft.bg_kind === 'video' ? '🔁 Replace video' : '🎞 Upload video'}<input type="file" accept="video/mp4,video/webm" className="hidden" disabled={upBusy} onChange={e => { uploadBg(e.target.files?.[0] ?? null, 'video'); e.target.value = '' }} /></label>}
            </div>
            {draft.bg_media && <button className="text-rose-300 text-xs underline mt-2" onClick={() => setDraft(d => ({ ...d, bg_media: null, bg_poster: null, bg_kind: null }))}>Remove my backdrop</button>}</div>}
          <div className="flex gap-2 flex-wrap mt-3"><button className="sym-btn flex-1" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save my look'}</button><button className="sym-btn" disabled={!dirty} onClick={() => data && setDraft(normEquip(data.equipped))}>Undo</button></div>
          {msg && <p className="text-amber-300 text-sm mt-2" role="status">{msg}</p>}
          <p className="text-xs text-gray-500 mt-2">Collection: <b className="text-white">{mine}</b> of {total} unlocked{isKing && <> · <span className="king-tag">👑 King: everything is free for you</span></>}</p>
        </div>
        <div className="studio-pick">
          <div className="seg" role="tablist" aria-label="Customisation type">{SLOTS.map(s => <button key={s.id} role="tab" aria-selected={slot === s.id} className={slot === s.id ? 'on' : ''} onClick={() => setSlot(s.id)}><i aria-hidden="true">{s.icon}</i>{s.label}</button>)}</div>
          <p className="text-xs text-gray-400 my-2">{SLOTS.find(s => s.id === slot)?.hint}</p>
          <div className="tiles">{list.map(i => {
            const ok = has(i); const on = draft[i.slot] === i.code; const isNew = owned.get(i.code)?.seen === false
            return (
              <button key={i.code} className={'tile' + (on ? ' on' : '') + (ok ? '' : ' lock')} onClick={() => pick(i)} aria-pressed={on} aria-label={`${i.name}${ok ? '' : ' (locked)'}`}>
                <span className="tile-pv"><ItemPreview item={i} />{!ok && <em className="tile-lock" aria-hidden="true">🔒</em>}{isNew && <em className="tile-new">NEW</em>}</span>
                <b>{i.name}</b><Rarity r={i.rarity} />
              </button>)
          })}</div>
        </div>
      </div>
    </div>)
}

// ================= Quests: earn styles =================
export function Quests() {
  const { data, err, load } = useOverview(); const items = useAllItems(); const [msg, setMsg] = useState(''); const [note, setNote] = useState<Record<string, string>>({}); const [busy, setBusy] = useState('')
  const item = (c: string) => items.find(i => i.code === c)
  const tasks = data?.tasks ?? []
  const ready = tasks.filter(t => t.kind === 'auto' && !t.owned && t.progress >= t.target)
  const todo = tasks.filter(t => !t.owned && !ready.includes(t))
  const done = tasks.filter(t => t.owned)
  const gifts = (data?.owned ?? []).filter(o => o.source === 'gift')
  const claim = async (t: Task) => { setBusy(t.id); const r = await supabase.rpc('style_claim', { p_task: t.id }); setBusy(''); setMsg(r.error ? '❌ ' + r.error.message : `🎉 Unlocked ${(r.data as any)?.name}! Equip it in Style Studio.`); load() }
  const send = async (t: Task) => { setBusy(t.id); const r = await supabase.rpc('style_submit', { p_task: t.id, p_note: note[t.id] ?? '' }); setBusy(''); setMsg(r.error ? '❌ ' + r.error.message : 'Sent to the admins ✅'); if (!r.error) setNote({ ...note, [t.id]: '' }); load() }
  const Card = ({ t }: { t: Task }) => {
    const it = item(t.reward); const pct = t.kind === 'auto' ? Math.round(t.progress / t.target * 100) : 0; const can = t.kind === 'auto' && !t.owned && t.progress >= t.target
    return (
      <div className={'glass quest' + (can ? ' ready' : '') + (t.owned ? ' done' : '')}>
        <div className="quest-pv">{it && <ItemPreview item={it} />}</div>
        <div className="quest-main">
          <div className="flex items-center gap-2 flex-wrap"><b>{t.title}</b>{it && <Rarity r={it.rarity} />}{t.kind === 'manual' && <span className="chipx">admin checks</span>}</div>
          <p className="text-xs text-gray-400">{t.description}</p>
          <p className="text-xs mt-1">Reward: <b className="text-amber-300">{it?.name ?? t.reward}</b></p>
          {t.kind === 'auto' && !t.owned && <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={t.target} aria-valuenow={t.progress}><i style={{ width: pct + '%' }} /><span>{yes(t.metric) ? (t.progress ? 'Done' : 'Not yet') : `${t.progress.toLocaleString()} / ${t.target.toLocaleString()} ${unit(t.metric)}`}</span></div>}
          {t.owned && <p className="text-xs text-emerald-300 mt-1">✓ Unlocked</p>}
          {can && <button className="sym-btn ok mt-2" disabled={busy === t.id} onClick={() => claim(t)}>Claim reward</button>}
          {t.kind === 'manual' && !t.owned && (t.pending ? <p className="text-xs text-amber-300 mt-2">⏳ Waiting for an admin to check it.</p> : <div className="mt-2">
            {t.rejected && <p className="text-xs text-rose-300 mb-1">Not approved: {t.rejected}. You can try again.</p>}
            <textarea className="sym-inp" rows={2} maxLength={400} placeholder="Tell the admins what you did" value={note[t.id] ?? ''} onChange={e => setNote({ ...note, [t.id]: e.target.value })} />
            <button className="sym-btn" disabled={busy === t.id || (note[t.id] ?? '').trim().length < 3} onClick={() => send(t)}>I did it, please check</button></div>)}
        </div>
      </div>)
  }
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap"><div><h1 className="h1">Quests</h1><p className="text-sm text-gray-400">Finish quests to unlock frames, golden profiles, video backdrops and more.</p></div><span className="ml-auto" /><Link to="/style" className="sym-btn">🎨 Style Studio</Link></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      {msg && <p className="glass p-3 text-sm" role="status">{msg}</p>}
      {!data && !err && <p className="text-center text-gray-400 animate-pulse">Loading…</p>}
      {!!ready.length && <section><h2 className="h2">Ready to claim ({ready.length})</h2><div className="quests">{ready.map(t => <Card key={t.id} t={t} />)}</div></section>}
      {!!todo.length && <section><h2 className="h2">In progress</h2><div className="quests">{todo.map(t => <Card key={t.id} t={t} />)}</div></section>}
      {!!gifts.length && <section><h2 className="h2">Gifts from the admins 🎁</h2><div className="quests">{gifts.map(g => { const it = item(g.code); return it ? <div key={g.code} className="glass quest done"><div className="quest-pv"><ItemPreview item={it} /></div><div className="quest-main"><b>{it.name}</b> <Rarity r={it.rarity} /><p className="text-xs text-gray-400">{g.note || 'A gift just for you.'}</p></div></div> : null })}</div></section>}
      {!!done.length && <section><h2 className="h2">Completed ({done.length})</h2><div className="quests">{done.map(t => <Card key={t.id} t={t} />)}</div></section>}
    </div>)
}
