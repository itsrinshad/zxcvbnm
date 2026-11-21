// Everyone's profile style, loaded once and kept live, so frames and name effects show up on every page (chat, ranks, players...).
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './lib'
import { Equip, Item, normEquip } from './styleCatalog'

const styles = new Map<string, Equip>(); const custom = new Map<string, Item>()
let ver = 0; const subs = new Set<() => void>(); let started = ''; let channel: ReturnType<typeof supabase.channel> | null = null
const bump = () => { ver++; subs.forEach(f => f()) }
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const snap = () => ver

type Row = { member_id: string } & Partial<Equip>
const putRow = (r: Row) => { const { member_id, ...rest } = r; styles.set(member_id, normEquip(rest)) }
const rowToItem = (r: any): Item => ({ code: r.code, slot: r.slot, name: r.name, rarity: r.rarity, desc: r.description ?? '', media: r.media, poster: r.poster, kind: r.kind, custom: !!r.custom, free: !!r.is_free })

export async function loadStyles() {
  const [a, b] = await Promise.all([supabase.from('member_style').select('*'), supabase.from('style_items').select('*').eq('custom', true).eq('active', true)])
  if (!a.error) (a.data ?? []).forEach(r => putRow(r as Row))
  if (!b.error) { custom.clear(); (b.data ?? []).forEach(r => custom.set(r.code, rowToItem(r))) }
  bump()
}
/** Start (or stop, with no id) the shared style sync. Safe to call many times. */
export function startStyleSync(uid?: string | null) {
  if (!uid) { if (channel) supabase.removeChannel(channel); channel = null; started = ''; styles.clear(); custom.clear(); bump(); return }
  if (started === uid) return; started = uid
  loadStyles()
  if (channel) supabase.removeChannel(channel)
  channel = supabase.channel('style-live').on('postgres_changes', { event: '*', schema: 'public', table: 'member_style' }, (p: any) => { if (p.new?.member_id) { putRow(p.new); bump() } }).subscribe()
}
/** Put fresh data in the cache (used after the Players page / Studio loaded it) */
export function primeStyles(rows: { id: string; style?: Partial<Equip> | null }[]) { rows.forEach(r => styles.set(r.id, normEquip(r.style))); bump() }
export function primeCustom(items: Item[]) { items.forEach(i => { if (i.custom) custom.set(i.code, i) }); bump() }
export function setMyStyle(uid: string, e: Partial<Equip>) { styles.set(uid, normEquip(e)); bump() }

export const getCustom = () => custom
/** Re-render when any style changes; returns the equipped style of one member (defaults when unknown). */
export function useEquip(uid?: string | null): Equip { useSyncExternalStore(sub, snap, snap); return normEquip(uid ? styles.get(uid) : null) }
export function useCustomItems(): Map<string, Item> { useSyncExternalStore(sub, snap, snap); return custom }
export function useStyleSync(uid?: string | null) { useEffect(() => { startStyleSync(uid) }, [uid]) }
