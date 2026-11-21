import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { StyledAvatar, StyledName } from './StyleKit'

const inp = 'sym-inp'
const btn = 'sym-btn'

export function Leaderboard() {
  const [tab, setTab] = useState('weekly'); const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState(''); const [loading, setLoading] = useState(true)
  useEffect(() => { setLoading(true); supabase.from('v_lb_' + tab).select('*').order('rnk').limit(100).then(r => { setRows(r.data ?? []); setLoading(false) }) }, [tab])
  const list = rows.filter(r => (r.display_name ?? r.username ?? '').toLowerCase().includes(q.toLowerCase()))
  return (<div className="space-y-3">
    <h1 className="h1">Leaderboard</h1>
    <div className="seg" role="tablist">{['daily', 'weekly', 'monthly', 'lifetime'].map(t => <button key={t} role="tab" aria-selected={t === tab} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <input className={inp} placeholder="🔍 Search members" value={q} onChange={e => setQ(e.target.value)} />
    {loading && <p className="text-center text-gray-400 text-sm animate-pulse">Loading…</p>}
    <div className="lb">{list.map(r => (
      <Link key={r.member_id} to={`/u/${r.username}`} className={'glass lb-row' + (r.rnk <= 3 ? ' top' + r.rnk : '')}>
        <b className="lb-rk">{r.rnk <= 3 ? ['🥇', '🥈', '🥉'][r.rnk - 1] : '#' + r.rnk}</b>
        <StyledAvatar uid={r.member_id} url={r.avatar_url} name={r.display_name || r.username} size={42} />
        <span className="flex-1 min-w-0 truncate"><StyledName uid={r.member_id} name={r.display_name ?? r.username} /></span>
        <b className="text-amber-300">{Number(r.glory).toLocaleString()}</b>
      </Link>))}</div>
    {!loading && !list.length && <p className="text-center text-gray-400 text-sm">No entries yet.</p>}
  </div>)
}

