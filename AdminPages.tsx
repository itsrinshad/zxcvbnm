import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { Avatar } from './ui'

type Row = { member_id: string; username: string; display_name: string | null; avatar_url: string | null; role: string; joined_at: string; last_seen: string | null; visited: string[] }
const istDay = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10)
export function AdminInfo() {
  const [rows, setRows] = useState<Row[]>([]); const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [sort, setSort] = useState('absent'); const [only, setOnly] = useState('all'); const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); supabase.rpc('admin_attendance', { p_days: 30 }).then(r => { setLoading(false); if (r.error) setErr(r.error.message + ' — run SYMBIOTES_PHASE4.sql in Supabase.'); else setRows((r.data ?? []) as Row[]) }) }
  useEffect(() => { load() }, [])
  const today = istDay(); const days = useMemo(() => Array.from({ length: 30 }, (_, i) => istDay(new Date(Date.now() - (29 - i) * 86400e3))), [today])
  const data = useMemo(() => rows.map(r => {
    const set = new Set(r.visited); const cnt = days.filter(d => set.has(d)).length; let streak = 0
    for (let i = 29; i >= 0 && !set.has(days[i]); i--) streak++
    return { ...r, set, cnt, streak, here: set.has(today) }
  }), [rows, days, today])
  const here = data.filter(r => r.here); const gone = data.filter(r => !r.here)
  const list = data.filter(r => (r.username + (r.display_name ?? '')).toLowerCase().includes(q.toLowerCase()) && (only === 'all' || (only === 'inactive7' && r.streak >= 7) || (only === 'inactive14' && r.streak >= 14) || (only === 'never' && r.cnt === 0) || (only === 'today' && r.here) || (only === 'absent' && !r.here)))
    .sort((a, b) => sort === 'absent' ? b.streak - a.streak : sort === 'least' ? a.cnt - b.cnt : sort === 'most' ? b.cnt - a.cnt : sort === 'seen' ? String(b.last_seen ?? '').localeCompare(String(a.last_seen ?? '')) : a.username.localeCompare(b.username))
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="text-xl font-bold">Admin info</h1><button className="ml-auto sym-btn !py-1 text-xs" onClick={load}>↻ Refresh</button></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass p-2"><b className="text-2xl text-emerald-300">{here.length}</b><div className="text-xs text-gray-400">Visited today</div></div>
        <div className="glass p-2"><b className="text-2xl text-rose-300">{gone.length}</b><div className="text-xs text-gray-400">Absent today</div></div>
        <div className="glass p-2"><b className="text-2xl">{data.filter(r => r.streak >= 7).length}</b><div className="text-xs text-gray-400">Away 7+ days</div></div>
      </div>
      <details className="glass p-3" open><summary className="cursor-pointer font-semibold">✅ Visited today ({here.length})</summary>{here.map(r => <div key={r.member_id} className="flex items-center gap-2 py-1 text-sm"><Avatar src={r.avatar_url} name={r.display_name || r.username} size={26} ring={false} />{r.display_name || r.username}</div>)}</details>
      <details className="glass p-3"><summary className="cursor-pointer font-semibold">🚫 Absent today ({gone.length})</summary>{gone.map(r => <div key={r.member_id} className="flex items-center gap-2 py-1 text-sm"><Avatar src={r.avatar_url} name={r.display_name || r.username} size={26} ring={false} />{r.display_name || r.username}<small className="ml-auto text-gray-500">{r.streak >= 30 ? '30+ days' : r.streak + 'd'}</small></div>)}</details>
      <section className="glass p-3" aria-label="30-day attendance">
        <b>30-day attendance</b>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input className="sym-inp !mb-0" placeholder="🔍 Find a player" value={q} onChange={e => setQ(e.target.value)} />
          <select className="sym-inp !mb-0" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="absent">Longest absent first</option><option value="least">Fewest days</option><option value="most">Most days</option><option value="seen">Last seen</option><option value="name">Name A–Z</option></select>
          <select className="sym-inp !mb-0 col-span-2" value={only} onChange={e => setOnly(e.target.value)} aria-label="Filter"><option value="all">Show everyone</option><option value="today">Visited today</option><option value="absent">Absent today</option><option value="inactive7">Inactive 7+ days</option><option value="inactive14">Inactive 14+ days</option><option value="never">No visits in 30 days</option></select>
        </div>
        {loading && <p className="text-xs text-gray-400 mt-2">Loading…</p>}
        <div className="mt-2 space-y-2">{list.map(r => (
          <div key={r.member_id} className="py-1.5 border-t border-white/10 first:border-0">
            <div className="flex items-center gap-2 text-sm"><Avatar src={r.avatar_url} name={r.display_name || r.username} size={26} ring={false} /><b className="truncate">{r.display_name || r.username}</b>
              <span className="ml-auto text-xs"><b className={r.cnt < 5 ? 'text-rose-300' : 'text-emerald-300'}>{r.cnt}/30</b> days</span></div>
            <div className="att-strip" role="img" aria-label={`${r.cnt} of 30 days visited`}>{days.map(d => <i key={d} className={r.set.has(d) ? 'on' : ''} title={d} />)}</div>
            <div className="text-[11px] text-gray-500">Last seen {r.last_seen ? new Date(r.last_seen).toLocaleDateString() : 'never'} · absent {r.streak >= 30 ? '30+' : r.streak} day{r.streak === 1 ? '' : 's'} in a row</div>
          </div>))}{!list.length && !loading && <p className="text-xs text-gray-400">No players match.</p>}</div>
      </section>
    </div>)
}
