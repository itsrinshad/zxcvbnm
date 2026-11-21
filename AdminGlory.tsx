import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'

// Admin glory: (1) daily totals, any time, any day  (2) weekly "last glory".
// Weekly glory = (sum of the daily gains Monday to Saturday) - last glory.
const ist = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const mondayOf = (d: string) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10) }
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
type Mem = { id: string; username: string; display_name: string | null }
const num = (v: string | undefined) => (v === undefined || v.trim() === '' || !/^\d+$/.test(v.trim()) ? null : parseInt(v.trim(), 10))

export function AdminGlory() {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily'); const [members, setMembers] = useState<Mem[]>([]); const [q, setQ] = useState('')
  useEffect(() => { supabase.from('profiles').select('id,username,display_name').eq('status', 'active').order('username').then(r => setMembers((r.data ?? []) as Mem[])) }, [])
  const shown = useMemo(() => members.filter(m => ((m.display_name ?? '') + m.username).toLowerCase().includes(q.toLowerCase())), [members, q])
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">🔥 Glory</h1></div>
      <div className="seg" role="tablist">{([['daily', 'Daily glory'], ['weekly', 'Weekly last glory']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <input className="sym-inp" placeholder="🔍 Search members" value={q} onChange={e => setQ(e.target.value)} />
      {tab === 'daily' ? <Daily members={shown} /> : <Weekly members={shown} />}
    </div>)
}

function Daily({ members }: { members: Mem[] }) {
  const [day, setDay] = useState(ist()); const [v, setV] = useState<Record<string, string>>({}); const [prev, setPrev] = useState<Record<string, number>>({}); const [saved, setSaved] = useState<Record<string, number>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    supabase.from('gl_daily').select('member_id,total,day').lte('day', day).order('day', { ascending: false }).limit(5000).then(r => {
      const p: Record<string, number> = {}; const s: Record<string, number> = {}
      ;(r.data ?? []).forEach((x: any) => { if (x.day === day) s[x.member_id] = Number(x.total); else if (p[x.member_id] === undefined) p[x.member_id] = Number(x.total) })
      setPrev(p); setSaved(s)
    })
  }, [day])
  useEffect(() => { load(); setV({}) }, [load])
  const filled = Object.entries(v).filter(([, g]) => num(g) !== null)
  const save = async () => {
    const entries = filled.map(([member_id, g]) => ({ member_id, total: num(g) }))
    if (!entries.length) return setMsg('Type at least one total first.')
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('glory_submit_daily', { p_day: day, entries })
    setBusy(false)
    if (error) return setMsg('❌ ' + error.message + (/function .* does not exist|schema cache/i.test(error.message) ? ' (run SYMBIOTES_PHASE7.sql in Supabase first)' : ''))
    setMsg(`✅ Saved ${(data as any)?.saved ?? entries.length} entries for ${day}`); setV({}); load(); window.dispatchEvent(new Event('sym-glory-submitted'))
  }
  return (
    <div className="space-y-3">
      <div className="glass p-3 space-y-2">
        <p className="text-sm text-gray-300">Type each member's <b>total glory shown in the game</b>. Today's gain = this total − the previous saved total. You can upload at any time and for any past day (no time window).</p>
        <label className="text-xs text-gray-400 block">Day<input type="date" className="sym-inp !mt-1" max={ist()} value={day} onChange={e => e.target.value && setDay(e.target.value)} /></label>
      </div>
      <div className="glass p-3">
        {members.map(m => {
          const p = prev[m.id]; const n = num(v[m.id]); const s = saved[m.id]
          return (
            <div key={m.id} className="flex justify-between items-center mb-2 gap-2">
              <span className="flex-1 min-w-0 truncate">{m.display_name ?? m.username}
                <small className="block text-gray-500">{p !== undefined ? `previous total ${p.toLocaleString()}` : 'first entry = starting point'}{s !== undefined ? ` · saved ${s.toLocaleString()}` : ''}{n !== null && p !== undefined ? ` · gain ${n - p >= 0 ? '+' : ''}${(n - p).toLocaleString()}` : ''}</small></span>
              <input type="number" inputMode="numeric" min={0} className="sym-inp !mb-0 !w-32" placeholder={s !== undefined ? String(s) : 'Total now'} value={v[m.id] ?? ''} onChange={e => setV({ ...v, [m.id]: e.target.value })} />
            </div>)
        })}
        {!members.length && <p className="text-sm text-gray-400">No members found.</p>}
      </div>
      <div className="sticky bottom-20 md:bottom-3 z-10"><button className="sym-btn w-full" disabled={busy || !filled.length} onClick={save}>{busy ? 'Saving…' : `Submit glory (${filled.length})`}</button>{msg && <p className="glass p-2 mt-2 text-sm text-amber-300">{msg}</p>}</div>
    </div>)
}

function Weekly({ members }: { members: Mem[] }) {
  const [week, setWeek] = useState(mondayOf(ist())); const [rows, setRows] = useState<Record<string, { daily_sum: number; last_glory: number; weekly: number }>>({}); const [v, setV] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    supabase.rpc('glory_week', { p_week: week }).then(r => {
      if (r.error) return setMsg('❌ ' + r.error.message + ' (run SYMBIOTES_PHASE7.sql in Supabase first)')
      const m: Record<string, any> = {}; ;(r.data ?? []).forEach((x: any) => { m[x.member_id] = { daily_sum: Number(x.daily_sum), last_glory: Number(x.last_glory), weekly: Number(x.weekly) } }); setRows(m)
    })
  }, [week])
  useEffect(() => { load(); setV({}) }, [load])
  const filled = Object.entries(v).filter(([, g]) => num(g) !== null)
  const save = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase.rpc('glory_set_last', { p_week: week, entries: filled.map(([member_id, g]) => ({ member_id, last: num(g) })) })
    setBusy(false); if (error) return setMsg('❌ ' + error.message)
    setMsg('✅ Saved. Weekly glory updated on the leaderboard.'); setV({}); load(); window.dispatchEvent(new Event('sym-glory-submitted'))
  }
  return (
    <div className="space-y-3">
      <div className="glass p-3 space-y-2">
        <p className="text-sm text-gray-300"><b>Weekly glory</b> = sum of daily glory (Monday to Saturday) − <b>last glory</b>. Enter each member's last glory below; the site does the sum and shows the result on the weekly leaderboard.</p>
        <div className="flex items-center gap-2 flex-wrap"><button className="sym-btn !py-1" onClick={() => setWeek(addDays(week, -7))}>← Prev</button><b className="text-sm">Week {week} → {addDays(week, 5)}</b><button className="sym-btn !py-1" disabled={week >= mondayOf(ist())} onClick={() => setWeek(addDays(week, 7))}>Next →</button></div>
      </div>
      <div className="glass p-3">
        {members.map(m => {
          const r = rows[m.id]; const n = num(v[m.id]); const last = n !== null ? n : r?.last_glory ?? 0; const sum = r?.daily_sum ?? 0
          return (
            <div key={m.id} className="flex justify-between items-center mb-2 gap-2">
              <span className="flex-1 min-w-0 truncate">{m.display_name ?? m.username}
                <small className="block text-gray-500">Mon–Sat sum {sum.toLocaleString()} − last {last.toLocaleString()} = <b className="text-amber-300">{Math.max(sum - last, 0).toLocaleString()}</b></small></span>
              <input type="number" inputMode="numeric" min={0} className="sym-inp !mb-0 !w-32" placeholder={r ? String(r.last_glory) : 'Last glory'} value={v[m.id] ?? ''} onChange={e => setV({ ...v, [m.id]: e.target.value })} />
            </div>)
        })}
      </div>
      <div className="sticky bottom-20 md:bottom-3 z-10"><button className="sym-btn w-full" disabled={busy || !filled.length} onClick={save}>{busy ? 'Saving…' : `Save last glory (${filled.length})`}</button>{msg && <p className="glass p-2 mt-2 text-sm text-amber-300">{msg}</p>}</div>
    </div>)
}
