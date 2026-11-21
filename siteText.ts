// Editable website text. Admins change it in Admin > Website text; anything left empty falls back to these defaults.
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './lib'

export type TextField = { key: string; label: string; group: string; multi?: boolean; hint?: string }
export const TEXT_DEFAULTS: Record<string, string> = {
  'hero.eyebrow': 'Free Fire guild · Now recruiting',
  'hero.headline': 'Squad up. Rank up. Rise together.',
  'hero.caption': 'The Free Fire guild for players who love to win.',
  'hero.cta1': 'Join the guild',
  'hero.cta2': 'Member login',
  'marquee': 'Free Fire guild · Weekly glory wars · Ranked squads · Custom profiles · Daily active',
  'why.kicker': 'Why SYMBIOTES',
  'why.lead': 'One web. One squad.',
  'why.items': '🏆 Compete | Live glory ranks, every week.\n🎨 Customise | Frames, auras and video profiles.\n💬 Connect | Chat, polls and news in one place.',
  'showcase.kicker': 'Make it yours',
  'showcase.title': 'Profiles that stand out.',
  'showcase.text': '',
  'steps.kicker': 'Join in 3 steps',
  'steps.title': 'Easy.',
  'steps.items': 'Message an admin\nLog in and set up your profile\nPlay, earn glory, unlock styles',
  'faq.title': 'Quick answers',
  'faq.items': 'Is it free? | Yes, completely. You only need a Free Fire account.\nHow do I get an account? | Tap Join below and message an admin on WhatsApp.\nHow is glory counted? | Admins record it daily. The week closes on Sunday.',
  'join.title': 'Ready to join?',
  'join.text': 'Message an admin, then log in and claim your spot.',
  'footer': 'SYMBIOTES © Free Fire guild family',
}
export const TEXT_FIELDS: TextField[] = [
  { key: 'hero.eyebrow', label: 'Top small line', group: 'Top of the page' },
  { key: 'hero.headline', label: 'Big headline', group: 'Top of the page' },
  { key: 'hero.caption', label: 'Caption under the headline', group: 'Top of the page', multi: true },
  { key: 'hero.cta1', label: 'Main button text', group: 'Top of the page' },
  { key: 'hero.cta2', label: 'Login button text', group: 'Top of the page' },
  { key: 'marquee', label: 'Moving strip (separate with  ·  )', group: 'Top of the page', multi: true },
  { key: 'why.kicker', label: 'Small title', group: 'Why join' },
  { key: 'why.lead', label: 'Big sentence', group: 'Why join', multi: true },
  { key: 'why.items', label: 'Three points (one per line: Title | text)', group: 'Why join', multi: true },
  { key: 'showcase.kicker', label: 'Small title', group: 'Profile showcase' },
  { key: 'showcase.title', label: 'Title', group: 'Profile showcase' },
  { key: 'showcase.text', label: 'Text', group: 'Profile showcase', multi: true },
  { key: 'steps.kicker', label: 'Small title', group: 'How it works' },
  { key: 'steps.title', label: 'Title', group: 'How it works' },
  { key: 'steps.items', label: 'Steps (one per line)', group: 'How it works', multi: true },
  { key: 'faq.title', label: 'Title', group: 'Questions' },
  { key: 'faq.items', label: 'Questions (one per line: Question | answer)', group: 'Questions', multi: true },
  { key: 'join.title', label: 'Title', group: 'Join section' },
  { key: 'join.text', label: 'Text', group: 'Join section', multi: true },
  { key: 'footer', label: 'Footer line', group: 'Join section' },
]

let over: Record<string, string> = {}; let ver = 0; let loaded = false
const subs = new Set<() => void>(); const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
const bump = () => { ver++; subs.forEach(f => f()) }
export async function loadSiteText() {
  try {
    const r = await supabase.from('site_settings').select('value').eq('key', 'site_text').maybeSingle()
    over = (r.data?.value && typeof r.data.value === 'object') ? r.data.value as Record<string, string> : {}
  } catch { /* keep defaults */ }
  loaded = true; bump()
}
export async function saveSiteText(next: Record<string, string>): Promise<string | null> {
  const clean: Record<string, string> = {}
  Object.entries(next).forEach(([k, v]) => { if (k in TEXT_DEFAULTS && v.trim() && v.trim() !== TEXT_DEFAULTS[k]) clean[k] = v.trim() })
  const { error } = await supabase.from('site_settings').upsert({ key: 'site_text', value: clean, updated_at: new Date().toISOString() })
  if (error) return error.message
  over = clean; bump(); return null
}
export const getOverrides = () => over
export function useSiteText() {
  useSyncExternalStore(sub, () => ver, () => ver)
  useEffect(() => { if (!loaded) loadSiteText() }, [])
  const t = (k: string) => over[k] || TEXT_DEFAULTS[k] || ''
  const list = (k: string) => t(k).split('\n').map(s => s.trim()).filter(Boolean)
  const pairs = (k: string): [string, string][] => list(k).map(l => { const i = l.indexOf('|'); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
  return { t, list, pairs }
}
