import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import type { IntroItem } from './Intro'
import { SITE_BUCKET, sitePublicUrl, videoInfo } from './media'

type Cfg = { active: string; items: IntroItem[] }
const setFit = (cfg: Cfg, id: string, fit: 'cover' | 'contain'): Cfg => ({ ...cfg, items: cfg.items.map(i => i.id === id ? { ...i, fit } : i) })
const MAX_MB = 25

export function AdminIntro() {
  const [cfg, setCfg] = useState<Cfg>({ active: 'builtin', items: [] }); const [name, setName] = useState(''); const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { supabase.from('site_settings').select('value').eq('key', 'intro').maybeSingle().then(r => r.data?.value && setCfg({ active: r.data.value.active === 'none' ? 'builtin' : r.data.value.active ?? 'builtin', items: r.data.value.items ?? [] })) }, [])
  const save = async (next: Cfg, ok = 'Saved ✅') => {
    const { error } = await supabase.from('site_settings').upsert({ key: 'intro', value: next, updated_at: new Date().toISOString() })
    if (error) setMsg(error.message + ' (run SYMBIOTES_PHASE5_INTRO.sql?)'); else { setCfg(next); setMsg(ok) }
  }
  const add = async () => {
    if (!file || name.trim().length < 2) return; setBusy(true); setMsg('')
    if (!/^video\/(mp4|webm)$/.test(file.type)) { setBusy(false); return setMsg('Use an MP4 or WebM video.') }
    if (file.size > MAX_MB * 1048576) { setBusy(false); return setMsg(`Video is ${(file.size / 1048576).toFixed(1)} MB. Maximum is ${MAX_MB} MB. Compress it first.`) }
    const id = 'c' + Date.now().toString(36); const ext = file.type === 'video/webm' ? 'webm' : 'mp4'
    const info = await videoInfo(file)
    const v = await supabase.storage.from(SITE_BUCKET).upload(`intro/${id}.${ext}`, file, { contentType: file.type })
    if (v.error) { setBusy(false); return setMsg('Upload failed: ' + v.error.message) }
    let poster: string | undefined
    if (info.poster) { const p = await supabase.storage.from(SITE_BUCKET).upload(`intro/${id}.jpg`, info.poster, { contentType: 'image/jpeg' }); if (!p.error) poster = sitePublicUrl(`intro/${id}.jpg`) }
    await save({ active: id, items: [...cfg.items, { id, name: name.trim(), video: sitePublicUrl(`intro/${id}.${ext}`), poster, w: info.w || undefined, h: info.h || undefined }] }, 'Added and set as the starting animation ✅')
    setName(''); setFile(null); setBusy(false)
  }
  const del = async (it: IntroItem) => {
    if (!confirm(`Delete "${it.name}"?`)) return
    const base = it.video.split(`/${SITE_BUCKET}/`)[1]; if (base) await supabase.storage.from(SITE_BUCKET).remove([base, base.replace(/\.(mp4|webm)$/, '.jpg')])
    await save({ active: cfg.active === it.id ? 'builtin' : cfg.active, items: cfg.items.filter(x => x.id !== it.id) }, 'Deleted')
  }
  const Row = ({ id, title, sub, it }: { id: string; title: string; sub: string; it?: IntroItem }) => (
    <label className="glass p-3 flex items-center gap-3 cursor-pointer"><input type="radio" name="act" checked={cfg.active === id} onChange={() => save({ ...cfg, active: id }, `"${title}" is now the starting animation ✅`)} />
      <div className="flex-1 min-w-0"><b className="block truncate">{title}</b><small className="text-gray-400">{sub}</small></div>
      {it?.poster && <img src={it.poster} alt="" className="w-20 rounded" />}{it && <button className="text-gray-300 text-xs underline" onClick={e => { e.preventDefault(); save(setFit(cfg, it.id, it.fit === 'contain' ? 'cover' : 'contain'), 'Fit changed ✅') }}>{it.fit === 'contain' ? 'Show whole picture' : 'Fill screen'}</button>}{it && <button className="text-rose-300 text-xs underline" onClick={e => { e.preventDefault(); del(it) }}>Delete</button>}</label>)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">🎬 Starting animation</h1></div>
      <p className="text-sm text-gray-300">Your signature. It plays every time someone opens the website, and they can skip it. It fills the whole screen on phones and computers and tries to start WITH sound (some browsers need one tap first, the site shows a Tap for sound button). Visitors can mute or skip it.</p>
      <Row id="builtin" title="SYMBIOTES title card (default, silent)" sub="Emblem and name, about 3 seconds. Used until you upload your own." />
      {cfg.items.map(it => <Row key={it.id} id={it.id} title={it.name} sub={`Custom video${it.w && it.h ? ` · ${it.w}×${it.h}` : ''} · ${it.fit === 'contain' ? 'whole picture' : 'fills screen'}`} it={it} />)}
      <a className="sym-btn inline-block" href="/" target="_blank" rel="noreferrer">▶ Preview (opens the site)</a>
      <section className="glass p-3" aria-label="Add animation"><b>➕ Upload your animation</b>
        <p className="text-xs text-gray-400 mb-2">MP4 or WebM, up to {MAX_MB} MB. Landscape, square or portrait all work. 1080p, 5 to 15 seconds is ideal.</p>
        <input className="sym-inp" placeholder="Name, e.g. Signature intro" value={name} maxLength={40} onChange={e => setName(e.target.value)} />
        <label className="upload-box !p-3 text-sm block">🎞️ {file ? file.name : 'Choose video file'}<input type="file" accept="video/mp4,video/webm" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
        <button className="sym-btn w-full mt-2" disabled={busy || !file || name.trim().length < 2} onClick={add}>{busy ? 'Uploading…' : 'Upload and use it'}</button>
      </section>
      {msg && <p className="text-amber-300 text-sm" role="status">{msg}</p>}
    </div>)
}
