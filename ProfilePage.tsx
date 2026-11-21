import { waLink, igLink, WaIcon, IgIcon } from './ui'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { BADGE_ICON } from './Social'
import { ProfileCard } from './StyleKit'
import { useEquip } from './styleStore'

export function Profile() {
  const { username } = useParams(); const { session, isAdmin } = useAuth(); const me = session!.user.id; const nav = useNavigate()
  const [p, setP] = useState<any>(null); const [badges, setBadges] = useState<any[]>([]); const [stat, setStat] = useState<any>(null)
  const eq = useEquip(p?.id ?? me); const [edit, setEdit] = useState(false); const [msg, setMsg] = useState(''); 
  const [npw, setNpw] = useState(''); const [allBadges, setAllBadges] = useState<any[]>([]); const [giveId, setGiveId] = useState('')
  const load = async () => {
    const q = supabase.from('profiles').select('*'); const r = await (username ? q.eq('username', username.toLowerCase()) : q.eq('id', me)).maybeSingle()
    setP(r.data); if (!r.data) return
    const id = r.data.id
    supabase.from('member_badges').select('badges(name,code)').eq('member_id', id).then(x => setBadges(x.data ?? []))
    supabase.from('v_lb_lifetime').select('glory,rnk').eq('member_id', id).maybeSingle().then(x => setStat(x.data))
  }
  useEffect(() => { setEdit(false); setMsg(''); load() }, [username])
  useEffect(() => { if (isAdmin) supabase.from('badges').select('id,name').then(r => setAllBadges(r.data ?? [])) }, [isAdmin])
  if (!p) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  const mine = p.id === me
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }))
  const save = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: p.display_name, bio: p.bio, ff_ign: p.ff_ign, ff_uid: p.ff_uid, player_level: p.player_level ? Number(p.player_level) : null, ff_rank: p.ff_rank, whatsapp: p.whatsapp || null, instagram: p.instagram || null }).eq('id', me)
    setMsg(error ? error.message : 'Saved ✅'); if (!error) setEdit(false)
  }
  const upload = async (file?: File) => {
    if (!file) return; setMsg('Uploading photo…')
    const path = `${me}/avatar-${Date.now()}`
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type }); if (up.error) return setMsg(up.error.message)
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', me); set('avatar_url', url); setMsg('Photo updated ✅')
  }
  const share = async () => { const url = `${location.origin}/u/${p.username}`; try { if (navigator.share) await navigator.share({ title: `${p.display_name || p.username} on SYMBIOTES`, url }); else { await navigator.clipboard.writeText(url); setMsg('Profile link copied ✅') } } catch { /* cancelled */ } }
  const dm = async () => { const { data, error } = await supabase.rpc('get_or_create_dm', { other: p.id }); if (error) return setMsg(error.message); nav('/chat?c=' + data) }
  const give = async () => { if (!giveId) return; const { error } = await supabase.from('member_badges').insert({ member_id: p.id, badge_id: Number(giveId), awarded_by: me }); setMsg(error ? error.message : 'Badge given ✅'); load() }
  return (
    <div className="space-y-4">
      <ProfileCard p={{ ...p, glory: stat?.glory, rank: stat?.rnk, badges: badges.length }} equip={eq} size="lg" play>
        {mine && <div className="flex gap-2 flex-wrap mt-3"><Link to="/style" className="sym-btn">🎨 Customise</Link><Link to="/quests" className="sym-btn">⚔️ Quests</Link></div>}
      </ProfileCard>
      <div className="glass p-4">
        {p.bio && <p className="text-sm whitespace-pre-wrap mt-1">{p.bio}</p>}
        <p className="text-xs text-gray-400 mt-1">{p.ff_ign ? `🎮 ${p.ff_ign}` : ''} {p.ff_uid && p.ff_uid !== '0' ? `· ID ${p.ff_uid}` : ''} {p.player_level ? `· Lv ${p.player_level}` : ''} {p.ff_rank ? `· ${p.ff_rank}` : ''}</p>
        {(p.whatsapp || p.instagram) && <div className="soc">
          {p.whatsapp && <a href={waLink(p.whatsapp)} target="_blank" rel="noreferrer" className="g-wa"><WaIcon />WhatsApp</a>}
          {p.instagram && <a href={igLink(p.instagram)} target="_blank" rel="noreferrer" className="g-ig"><IgIcon />Instagram</a>}
        </div>}
        <div className="flex gap-2 mt-3">
          {mine ? <><button className="sym-btn flex-1" onClick={() => setEdit(!edit)}>{edit ? 'Close' : 'Edit profile'}</button><button className="sym-btn" onClick={share} aria-label="Share profile">🔗 Share</button><Link to="/settings" className="sym-btn text-center">⚙ Settings</Link></> : <button className="sym-btn flex-1" onClick={dm}>💬 Message</button>}
        </div>
        {msg && <p className="text-amber-300 text-sm mt-2">{msg}</p>}
      </div>

      {badges.length > 0 && <div className="badge-row">{badges.map((b, i) => <div key={i} className="badge-item"><span className="badge-c">{BADGE_ICON[b.badges?.code] ?? '🏅'}</span><small>{b.badges?.name}</small></div>)}</div>}
      {isAdmin && !mine && <div className="glass p-3 flex gap-2"><select className="sym-inp !mb-0" value={giveId} onChange={e => setGiveId(e.target.value)}><option value="">Give a badge…</option>{allBadges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="sym-btn" onClick={give}>Give</button></div>}

      {mine && edit && <div className="glass p-4 space-y-1">
        <label className="upload-box !p-3 text-sm">📷 Change profile photo<input type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} /></label>
        <input className="sym-inp" placeholder="Display name" value={p.display_name ?? ''} onChange={e => set('display_name', e.target.value)} />
        <textarea className="sym-inp" rows={3} placeholder="Bio" value={p.bio ?? ''} onChange={e => set('bio', e.target.value)} />
        <input className="sym-inp" placeholder="In-game name" value={p.ff_ign ?? ''} onChange={e => set('ff_ign', e.target.value)} />
        <input className="sym-inp" placeholder="Game ID (UID)" value={p.ff_uid ?? ''} onChange={e => set('ff_uid', e.target.value)} />
        <input className="sym-inp" inputMode="numeric" placeholder="Level" value={p.player_level ?? ''} onChange={e => set('player_level', e.target.value)} />
        <input className="sym-inp" placeholder="Rank (e.g. Heroic)" value={p.ff_rank ?? ''} onChange={e => set('ff_rank', e.target.value)} />
        <input className="sym-inp" inputMode="tel" placeholder="WhatsApp number with country code (e.g. 919876543210)" value={p.whatsapp ?? ''} onChange={e => set('whatsapp', e.target.value)} />
        <input className="sym-inp" placeholder="Instagram username (e.g. symbiotes.official)" value={p.instagram ?? ''} onChange={e => set('instagram', e.target.value)} />
        <button className="sym-btn w-full" onClick={save}>Save profile</button>
        <div className="mt-3 pt-3 border-t border-white/10">
          <input className="sym-inp" type="password" placeholder="New password (min 6)" value={npw} onChange={e => setNpw(e.target.value)} />
          <button className="sym-btn w-full" onClick={async () => { if (npw.length < 6) return setMsg('Password must be at least 6 characters.'); const { error } = await supabase.auth.updateUser({ password: npw }); setMsg(error ? error.message : 'Password changed ✅'); if (!error) setNpw('') }}>Change my password</button>
        </div>
        <button className="sym-btn danger w-full mt-2" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>Logout</button>
      </div>}

    </div>
  )
}
