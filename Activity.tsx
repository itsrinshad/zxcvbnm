import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { Avatar } from './ui'

type R = { member_id: string; username: string; display_name: string | null; avatar_url: string | null; last_seen: string | null; visited_today: boolean }
const ago = (t: string | null) => { if (!t) return 'a while ago'; const m = Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 60000)); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.floor(m / 60) + ' h ago' : Math.floor(m / 1440) + ' d ago' }

// Visible to every player: who has been on the site today (India time) and who has not.
export function Activity() {
  const [rows, setRows] = useState<R[]>([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const load = () => supabase.rpc('activity_today').then(r => { setLoading(false); if (r.error) setErr(r.error.message + ' (an admin needs to run SYMBIOTES_PHASE4.sql)'); else setRows((r.data ?? []) as R[]) })
  useEffect(() => { load(); const t = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, 60000); return () => window.clearInterval(t) }, [])
  const on = rows.filter(r => r.visited_today); const off = rows.filter(r => !r.visited_today)
  const Row = ({ r }: { r: R }) => <Link to={`/u/${r.username}`} className="flex items-center gap-3 py-1.5"><Avatar uid={r.member_id} src={r.avatar_url} name={r.display_name || r.username} size={36} /><div className="min-w-0"><b className="block truncate">{r.display_name || r.username}</b><small className="text-gray-400">{r.visited_today ? `Active ${ago(r.last_seen)}` : `Last seen ${ago(r.last_seen)}`}</small></div></Link>
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">📡 Activity</h1>
      <div className="grid grid-cols-2 gap-2 text-center"><div className="glass p-3"><b className="text-2xl text-emerald-300">{on.length}</b><div className="text-xs text-gray-400">Active today</div></div><div className="glass p-3"><b className="text-2xl text-rose-300">{off.length}</b><div className="text-xs text-gray-400">Inactive today</div></div></div>
      {err && <p className="glass p-3 text-amber-300 text-sm" role="alert">{err}</p>}
      {loading && <p className="text-center text-gray-400 text-sm">Loading…</p>}
      <section className="glass p-3"><b>🟢 Active today</b>{on.map(r => <Row key={r.member_id} r={r} />)}{!on.length && !loading && <p className="text-xs text-gray-400 mt-1">Nobody yet. Be the first!</p>}</section>
      <section className="glass p-3"><b>⚪ Inactive today</b>{off.map(r => <Row key={r.member_id} r={r} />)}</section>
      <p className="text-[11px] text-gray-500 text-center">“Today” follows India time (IST). It refreshes every minute.</p>
    </div>)
}
