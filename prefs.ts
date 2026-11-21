// Per-device display preferences (theme, lite mode, text size, music)
export type Prefs = { theme: string; lite: boolean; font: number; music: boolean; vol: number }
const K = 'sym_prefs2'
const low = () => { const m = (navigator as any).deviceMemory; return !!m && m <= 2 }
const def = (): Prefs => ({ theme: 'web', lite: low(), font: 16, music: true, vol: 0.4 })
export const getPrefs = (): Prefs => { try { const p = { ...def(), ...JSON.parse(localStorage.getItem(K) || '{}') }; if (p.theme === 'violet') p.theme = 'royal'; return p } catch { return def() } }
export const applyPrefs = (p: Prefs = getPrefs()) => { const r = document.documentElement; r.dataset.theme = p.theme; r.dataset.lite = p.lite ? '1' : '0'; r.style.fontSize = p.font + 'px' }
export const setPrefs = (patch: Partial<Prefs>) => { const n = { ...getPrefs(), ...patch }; try { localStorage.setItem(K, JSON.stringify(n)) } catch { /* private mode */ } applyPrefs(n); window.dispatchEvent(new Event('sym-prefs')); return n }
export const THEMES: { id: string; name: string; a: string; b: string }[] = [
  { id: 'web', name: 'Web', a: '#9AA4B2', b: '#E5484D' },
  { id: 'royal', name: 'Royal', a: '#8B5CF6', b: '#FBBF24' },
  { id: 'fire', name: 'Fire', a: '#F97316', b: '#FACC15' },
  { id: 'emerald', name: 'Venom', a: '#10B981', b: '#A3E635' },
  { id: 'ice', name: 'Ice', a: '#38BDF8', b: '#818CF8' },
  { id: 'rose', name: 'Rose', a: '#F43F5E', b: '#F59E0B' },
  { id: 'midnight', name: 'Midnight', a: '#3B82F6', b: '#22D3EE' },
  { id: 'sunset', name: 'Sunset', a: '#FB7185', b: '#FDBA74' },
  { id: 'aurora', name: 'Aurora', a: '#2DD4BF', b: '#A78BFA' },
  { id: 'sakura', name: 'Sakura', a: '#F472B6', b: '#FBCFE8' },
  { id: 'forest', name: 'Forest', a: '#4ADE80', b: '#FDE047' },
  { id: 'golden', name: 'Golden Hour', a: '#F59E0B', b: '#FDE68A' },
  { id: 'cyber', name: 'Neon Cyber', a: '#D946EF', b: '#22D3EE' },
  { id: 'crimson', name: 'Crimson', a: '#EF4444', b: '#FB923C' },
  { id: 'silver', name: 'Silver Mist', a: '#94A3B8', b: '#E2E8F0' },
  { id: 'cosmic', name: 'Cosmic', a: '#6366F1', b: '#EC4899' },
]
