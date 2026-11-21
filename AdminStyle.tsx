import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Item, METRICS, RARITY, Rarity as R, SLOTS, Slot, metricLabel } from './styleCatalog'
import { loadStyles } from './styleStore'
import { ItemPreview, Rarity } from './StyleKit'
import { SITE_BUCKET, sitePublicUrl, videoInfo } from './media'
import { useAllItems } from './Studio'
import { StyledAvatar } from './StyleKit'

type Tab = 'quests' | 'gifts' | 'review' | 'items'
type TaskRow = { id: string; title: string; description: string; kind: 'auto' | 'manual'; metric: string | null; target: number; reward_code: string; sort: number; active: boolean }
type Mem = { id: string; username: string; display_name: string | null; avatar_url: string | null }
const MAX_MB = 12

// Admin: quests, gifts, manual approvals and custom (video) items for the profile styles.
export function AdminStyle() {
  const { isKing } = useAuth(); const [tab, setTab] = useState<Tab>('quests'); const [msg, setMsg] = useState('')
  const say = (m: string) => setMsg(m)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">Quests{isKing ? ' & gifts' : ''}</h1>{isKing && <span className="king-tag">👑 KING</span>}</div>
      <p className="text-sm text-gray-400">Add, change or delete quests (profile upgrade tasks) and approve manual ones.{isKing ? ' As a King Admin you can also gift any style to players and upload custom video backdrops and titles.' : ''}</p>
      <div className="seg" role="tablist">{([['quests', '🏆 Quests'], ['gifts', '🎁 Gifts'], ['review', '✅ Review'], ['items', '🎞 My items']] as [Tab, string][]).filter(([k]) => isKing || k === 'quests' || k === 'review').map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {msg && <p className="glass p-3 text-sm" role="status">{msg}</p>}
      {tab === 'quests' && <QuestsAdmin say={say} />}
      {tab === 'gifts' && isKing && <GiftsAdmin say={say} />}
      {tab === 'review' && <ReviewAdmin say={say} />}
      {tab === 'items' && isKing && <ItemsAdmin say={say} />}
    </div>)
}

const useRewards = () => { const all = useAllItems(); return useMemo(() => all.filter(i => !i.free), [all]) }
function ItemSelect({ value, onChange, items, placeholder = 'Choose a style…' }: { value: string; onChange: (v: string) => void; items: Item[]; placeholder?: string }) {
  return <select className="sym-inp" value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{SLOTS.map(s => <optgroup key={s.id} label={s.label}>{items.filter(i => i.slot === s.id).map(i => <option key={i.code} value={i.code}>{i.name} · {RARITY[i.rarity].label}</option>)}</optgroup>)}</select>
}

// ---------- quests ----------
const blank = { id: '', title: '', description: '', kind: 'auto' as 'auto' | 'manual', metric: 'visit_days', target: 1, reward_code: '', sort: 500, active: true }
function QuestsAdmin({ say }: { say: (m: string) => void }) {
  const [rows, setRows] = useState<TaskRow[]>([]); const [f, setF] = useState<TaskRow>(blank); const items = useRewards()
  const load = useCallback(() => { supabase.from('style_tasks').select('*').order('sort').order('created_at').then(r => { if (r.error) say(r.error.message + ' — run SYMBIOTES_PHASE6_STYLE.sql'); else setRows((r.data ?? []) as TaskRow[]) }) }, [say])
  useEffect(() => { load() }, [load])
  const nameOf = (c: string) => items.find(i => i.code === c)?.name ?? c
  const save = async () => {
    if (f.title.trim().length < 3 || !f.reward_code) return say('Add a title (3+ letters) and choose a reward.')
    const row = { title: f.title.trim(), description: f.description.trim(), kind: f.kind, metric: f.kind === 'auto' ? f.metric : null, target: Math.max(1, Number(f.target) || 1), reward_code: f.reward_code, sort: Number(f.sort) || 500, active: f.active }
    const r = f.id ? await supabase.from('style_tasks').update(row).eq('id', f.id) : await supabase.from('style_tasks').insert(row)
    say(r.error ? '❌ ' + r.error.message : f.id ? 'Quest updated ✅' : 'Quest created ✅'); if (!r.error) { setF(blank); load() }
  }
  const toggle = async (t: TaskRow) => { const r = await supabase.from('style_tasks').update({ active: !t.active }).eq('id', t.id); say(r.error ? '❌ ' + r.error.message : t.active ? 'Hidden from members' : 'Visible to members'); load() }
  const del = async (t: TaskRow) => { if (!confirm(`Delete the quest “${t.title}”? Members who already unlocked its reward keep it.`)) return; const r = await supabase.from('style_tasks').delete().eq('id', t.id); say(r.error ? '❌ ' + r.error.message : 'Deleted'); load() }
  return (
    <div className="space-y-3">
      <section className="glass p-3"><b>{f.id ? '✏️ Edit quest' : '➕ New quest'}</b>
        <input className="sym-inp mt-2" placeholder="Title, e.g. Weekend warrior" maxLength={80} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <input className="sym-inp" placeholder="What the member must do" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="sym-inp" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as any })}><option value="auto">Automatic (the site measures it)</option><option value="manual">Manual (admin approves)</option></select>
          {f.kind === 'auto' ? <select className="sym-inp" value={f.metric ?? ''} onChange={e => setF({ ...f, metric: e.target.value })}>{METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select> : <div />}
          {f.kind === 'auto' && <input className="sym-inp" type="number" min={1} placeholder="Target number" value={f.target} onChange={e => setF({ ...f, target: Number(e.target.value) })} />}
          <input className="sym-inp" type="number" placeholder="Order (small = first)" value={f.sort} onChange={e => setF({ ...f, sort: Number(e.target.value) })} />
        </div>
        <ItemSelect value={f.reward_code} onChange={v => setF({ ...f, reward_code: v })} items={items} placeholder="Reward…" />
        <div className="flex gap-2"><button className="sym-btn flex-1" onClick={save}>{f.id ? 'Save changes' : 'Create quest'}</button>{f.id && <button className="sym-btn" onClick={() => setF(blank)}>Cancel</button>}</div>
      </section>
      <section className="space-y-2">{rows.map(t => (
        <div key={t.id} className={'glass p-3 ' + (t.active ? '' : 'opacity-50')}>
          <div className="flex items-start gap-2"><div className="flex-1 min-w-0"><b>{t.title}</b><p className="text-xs text-gray-400">{t.kind === 'auto' ? `${metricLabel(t.metric ?? '')} ≥ ${t.target.toLocaleString()}` : 'Manual approval'} → <b className="text-amber-300">{nameOf(t.reward_code)}</b></p></div>
            <button className="sym-btn !py-1 text-xs" onClick={() => { setF(t); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
            <button className="sym-btn !py-1 text-xs" onClick={() => toggle(t)}>{t.active ? 'Hide' : 'Show'}</button>
            <button className="sym-btn danger !py-1 text-xs" onClick={() => del(t)}>✕</button></div>
        </div>))}{!rows.length && <p className="text-sm text-gray-400">No quests yet.</p>}</section>
    </div>)
}

// ---------- gifts ----------
function GiftsAdmin({ say }: { say: (m: string) => void }) {
  const [mem, setMem] = useState<Mem[]>([]); const [q, setQ] = useState(''); const [who, setWho] = useState<Mem | null>(null); const [item, setItem] = useState(''); const [note, setNote] = useState(''); const [have, setHave] = useState<{ item_code: string; source: string }[]>([]); const items = useRewards()
  useEffect(() => { supabase.from('profiles').select('id,username,display_name,avatar_url').eq('status', 'active').order('username').then(r => setMem((r.data ?? []) as Mem[])) }, [])
  const loadHave = useCallback((m: Mem | null) => { if (!m) return setHave([]); supabase.from('style_unlocks').select('item_code,source').eq('member_id', m.id).then(r => setHave(r.data ?? [])) }, [])
  useEffect(() => { loadHave(who) }, [who, loadHave])
  const list = mem.filter(m => (m.username + (m.display_name ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, 40)
  const gift = async () => { if (!who || !item) return say('Pick a member and a style.'); const r = await supabase.rpc('style_gift', { p_member: who.id, p_item: item, p_note: note }); say(r.error ? '❌ ' + r.error.message : `🎁 Gift sent to ${who.display_name || who.username}`); if (!r.error) { setNote(''); loadHave(who) } }
  const all = async () => { if (!item) return say('Pick a style first.'); if (!confirm('Give this style to EVERY active member?')) return; const r = await supabase.rpc('style_gift_all', { p_item: item, p_note: note }); say(r.error ? '❌ ' + r.error.message : `🎁 Sent to ${r.data} members`) }
  const bundle = async () => { if (!who || !confirm('Unlock EVERY premium style for ' + (who.display_name || who.username) + '?')) return; const r = await supabase.rpc('style_gift_bundle', { p_member: who.id, p_note: note }); say(r.error ? '❌ ' + r.error.message : `👑 ${r.data} styles unlocked for ${who.display_name || who.username}`); if (!r.error) loadHave(who) }
  const revoke = async (code: string) => { if (!who || !confirm('Take this style back from ' + (who.display_name || who.username) + '?')) return; const r = await supabase.rpc('style_revoke', { p_member: who.id, p_item: code }); say(r.error ? '❌ ' + r.error.message : 'Taken back'); loadHave(who) }
  const nameOf = (c: string) => items.find(i => i.code === c)?.name ?? c
  return (
    <div className="space-y-3">
      <section className="glass p-3"><b>1. Choose a member</b>
        <input className="sym-inp mt-2" placeholder="🔍 Search members" value={q} onChange={e => setQ(e.target.value)} />
        <div className="pick-list">{list.map(m => <button key={m.id} className={'pick' + (who?.id === m.id ? ' on' : '')} onClick={() => setWho(m)}><StyledAvatar uid={m.id} url={m.avatar_url} name={m.display_name || m.username} size={30} /><span className="truncate">{m.display_name || m.username}</span></button>)}</div>
      </section>
      <section className="glass p-3"><b>2. Choose a style and send it</b>
        <div className="mt-2"><ItemSelect value={item} onChange={setItem} items={items} /></div>
        {item && (() => { const it = items.find(i => i.code === item); return it ? <div className="flex items-center gap-3 mb-2"><div className="gift-pv"><ItemPreview item={it} /></div><div><b>{it.name}</b> <Rarity r={it.rarity} /><p className="text-xs text-gray-400">{it.desc}</p></div></div> : null })()}
        <input className="sym-inp" maxLength={200} placeholder="Optional note, e.g. Thanks for winning the tournament!" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2 flex-wrap"><button className="sym-btn ok flex-1" onClick={gift} disabled={!who || !item}>🎁 Gift to {who ? (who.display_name || who.username) : '…'}</button><button className="sym-btn" onClick={all} disabled={!item}>Gift to everyone</button></div>
        <button className="sym-btn w-full mt-2" onClick={bundle} disabled={!who}>👑 Unlock ALL styles for {who ? (who.display_name || who.username) : '…'}</button>
      </section>
      {who && <section className="glass p-3"><b>{who.display_name || who.username} has earned</b>
        {!have.length && <p className="text-xs text-gray-400 mt-1">Nothing yet (free starter styles are not listed).</p>}
        {have.map(h => <div key={h.item_code} className="row text-sm"><span>{nameOf(h.item_code)} <small className="text-gray-500">· {h.source === 'gift' ? 'gift' : 'quest'}</small></span><button className="text-rose-300 text-xs underline" onClick={() => revoke(h.item_code)}>Take back</button></div>)}</section>}
    </div>)
}

// ---------- manual quest review ----------
function ReviewAdmin({ say }: { say: (m: string) => void }) {
  const [rows, setRows] = useState<any[]>([]); const [reason, setReason] = useState<Record<string, string>>({}); const items = useRewards()
  const load = useCallback(async () => {
    const s = await supabase.from('style_submissions').select('id,note,created_at,member_id,task_id').eq('status', 'pending').order('created_at')
    if (s.error) return say(s.error.message + ' — run SYMBIOTES_PHASE6_STYLE.sql')
    const subs = s.data ?? []; if (!subs.length) return setRows([])
    const [t, p] = await Promise.all([supabase.from('style_tasks').select('id,title,reward_code').in('id', [...new Set(subs.map(x => x.task_id))]), supabase.from('profiles').select('id,username,display_name').in('id', [...new Set(subs.map(x => x.member_id))])])
    const tm = new Map((t.data ?? []).map(x => [x.id, x])); const pm = new Map((p.data ?? []).map(x => [x.id, x]))
    setRows(subs.map(x => ({ ...x, task: tm.get(x.task_id), who: pm.get(x.member_id) })))
  }, [say])
  useEffect(() => { load() }, [load])
  const act = async (id: string, ok: boolean) => { const r = await supabase.rpc('style_review', { p_id: id, p_approve: ok, p_reason: reason[id] ?? null }); say(r.error ? '❌ ' + r.error.message : ok ? 'Approved, reward unlocked ✅' : 'Rejected'); load() }
  return (
    <div className="space-y-2">
      {!rows.length && <p className="glass p-4 text-sm text-gray-400 text-center">Nothing waiting for review.</p>}
      {rows.map(r => (
        <div key={r.id} className="glass p-3 text-sm space-y-1">
          <div><b>{r.who?.display_name || r.who?.username || 'member'}</b> finished <b>{r.task?.title}</b></div>
          <p className="text-gray-300 whitespace-pre-wrap">“{r.note}”</p>
          <p className="text-xs text-gray-500">Reward: {items.find(i => i.code === r.task?.reward_code)?.name ?? r.task?.reward_code} · {new Date(r.created_at).toLocaleString()}</p>
          <input className="sym-inp" placeholder="Reason (needed only to reject)" value={reason[r.id] ?? ''} onChange={e => setReason({ ...reason, [r.id]: e.target.value })} />
          <div className="flex gap-2"><button className="sym-btn ok" onClick={() => act(r.id, true)}>Approve</button><button className="sym-btn danger" onClick={() => act(r.id, false)}>Reject</button></div>
        </div>))}
    </div>)
}

// ---------- custom items (video backdrops, custom titles) ----------
function ItemsAdmin({ say }: { say: (m: string) => void }) {
  const { session } = useAuth(); const all = useAllItems(); const custom = all.filter(i => i.custom)
  const [slot, setSlot] = useState<Slot>('backdrop'); const [name, setName] = useState(''); const [rarity, setRarity] = useState<R>('epic'); const [desc, setDesc] = useState(''); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false)
  const add = async () => {
    const nm = name.trim(); if (nm.length < 2) return say('Give it a name (2+ letters).')
    setBusy(true); const code = 'cu_' + Date.now().toString(36); let media: string | null = null; let poster: string | null = null; let kind: 'video' | 'image' | null = null
    if (slot === 'backdrop') {
      if (!file) { setBusy(false); return say('Choose a video (MP4/WebM) or an image (JPG/PNG).') }
      const isVid = /^video\/(mp4|webm)$/.test(file.type); const isImg = /^image\/(jpeg|png)$/.test(file.type)
      if (!isVid && !isImg) { setBusy(false); return say('Use MP4, WebM, JPG or PNG.') }
      if (file.size > MAX_MB * 1048576) { setBusy(false); return say(`File is ${(file.size / 1048576).toFixed(1)} MB. The maximum is ${MAX_MB} MB. Compress it first (short 6–10 second loops work best).`) }
      const ext = isVid ? (file.type === 'video/webm' ? 'webm' : 'mp4') : file.type === 'image/png' ? 'png' : 'jpg'
      const up = await supabase.storage.from(SITE_BUCKET).upload(`style/${code}.${ext}`, file, { contentType: file.type }); if (up.error) { setBusy(false); return say('Upload failed: ' + up.error.message) }
      media = sitePublicUrl(`style/${code}.${ext}`); kind = isVid ? 'video' : 'image'
      if (isVid) { const info = await videoInfo(file); if (info.poster) { const p = await supabase.storage.from(SITE_BUCKET).upload(`style/${code}.jpg`, info.poster, { contentType: 'image/jpeg' }); if (!p.error) poster = sitePublicUrl(`style/${code}.jpg`) } }
    }
    const r = await supabase.from('style_items').insert({ code, slot, name: nm, rarity, description: desc.trim(), media, poster, kind, custom: true, is_free: false, created_by: session!.user.id })
    setBusy(false); if (r.error) return say('❌ ' + r.error.message)
    say('Item created ✅ Now gift it, or make it the reward of a quest.'); setName(''); setDesc(''); setFile(null); loadStyles()
  }
  const del = async (i: Item) => {
    if (!confirm(`Delete “${i.name}”? Members who own or wear it will lose it.`)) return
    const r = await supabase.rpc('style_item_delete', { p_code: i.code }); if (r.error) return say('❌ ' + r.error.message)
    const paths = [i.media, i.poster].map(u => u?.split(`/${SITE_BUCKET}/`)[1]).filter((p): p is string => !!p); if (paths.length) await supabase.storage.from(SITE_BUCKET).remove(paths)
    say('Deleted'); loadStyles()
  }
  return (
    <div className="space-y-3">
      <section className="glass p-3"><b>➕ New custom item</b>
        <p className="text-xs text-gray-400 mb-2">Video backdrops play behind the profile card (muted, looping). Titles are just a name shown under the member's name.</p>
        <div className="grid grid-cols-2 gap-2"><select className="sym-inp" value={slot} onChange={e => setSlot(e.target.value as Slot)}><option value="backdrop">Backdrop (video or image)</option><option value="title">Title (text only)</option></select>
          <select className="sym-inp" value={rarity} onChange={e => setRarity(e.target.value as R)}>{(Object.keys(RARITY) as R[]).map(r => <option key={r} value={r}>{RARITY[r].label}</option>)}</select></div>
        <input className="sym-inp" placeholder={slot === 'title' ? 'Title text, e.g. Diwali Champion' : 'Name, e.g. Neon Rain'} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
        <input className="sym-inp" placeholder="Short description (optional)" maxLength={120} value={desc} onChange={e => setDesc(e.target.value)} />
        {slot === 'backdrop' && <label className="upload-box !p-3 text-sm block">🎞️ {file ? file.name : `Choose video or image (max ${MAX_MB} MB, wide 16:9 or 3:2 looks best)`}<input type="file" accept="video/mp4,video/webm,image/jpeg,image/png" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>}
        <button className="sym-btn w-full mt-2" disabled={busy} onClick={add}>{busy ? 'Uploading…' : 'Create item'}</button>
      </section>
      <section className="space-y-2"><b>Your custom items ({custom.length})</b>
        {custom.map(i => <div key={i.code} className="glass p-3 flex items-center gap-3"><div className="gift-pv"><ItemPreview item={i} play /></div><div className="flex-1 min-w-0"><b className="truncate block">{i.name}</b><small className="text-gray-400">{SLOTS.find(s => s.id === i.slot)?.label} · {i.kind ?? 'text'} · <Rarity r={i.rarity} /></small></div><button className="sym-btn danger !py-1 text-xs" onClick={() => del(i)}>Delete</button></div>)}
        {!custom.length && <p className="text-sm text-gray-400">None yet.</p>}</section>
    </div>)
}
