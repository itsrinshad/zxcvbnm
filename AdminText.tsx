import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TEXT_DEFAULTS, TEXT_FIELDS, getOverrides, loadSiteText, saveSiteText } from './siteText'

// Admin > Website text: change the words on the visitors page. Empty = default text.
export function AdminText() {
  const [v, setV] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { loadSiteText().then(() => setV({ ...TEXT_DEFAULTS, ...getOverrides() })) }, [])
  const groups = useMemo(() => { const m = new Map<string, typeof TEXT_FIELDS>(); TEXT_FIELDS.forEach(f => m.set(f.group, [...(m.get(f.group) ?? []), f])); return [...m.entries()] }, [])
  const save = async () => { setBusy(true); const e = await saveSiteText(v); setBusy(false); setMsg(e ? '❌ ' + e + ' (run SYMBIOTES_PHASE7.sql?)' : '✅ Saved. Visitors see the new text now.') }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Link to="/admin" className="text-xs underline text-gray-400">← Admin</Link><h1 className="h1">✍️ Website text</h1></div>
      <p className="text-sm text-gray-400">Change the words on the public page that visitors see. Lines with “Title | text” keep the bar between the title and the text. Reset puts back the original.</p>
      {groups.map(([g, fs]) => (
        <section key={g} className="glass p-3 space-y-2"><b>{g}</b>
          {fs.map(f => (
            <label key={f.key} className="block text-xs text-gray-400">{f.label}
              {f.multi ? <textarea className="sym-inp !mt-1" rows={Math.min(8, Math.max(2, (v[f.key] ?? '').split('\n').length + 1))} value={v[f.key] ?? ''} onChange={e => setV({ ...v, [f.key]: e.target.value })} /> : <input className="sym-inp !mt-1" value={v[f.key] ?? ''} onChange={e => setV({ ...v, [f.key]: e.target.value })} />}
              {(v[f.key] ?? '') !== TEXT_DEFAULTS[f.key] && <button type="button" className="text-[11px] underline text-amber-300" onClick={() => setV({ ...v, [f.key]: TEXT_DEFAULTS[f.key] })}>Reset this</button>}
            </label>))}
        </section>))}
      <div className="sticky bottom-20 md:bottom-3 z-10"><button className="sym-btn w-full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save text'}</button>{msg && <p className="glass p-2 mt-2 text-sm">{msg}</p>}</div>
    </div>)
}
