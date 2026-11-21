// Profile customisation catalogue. Built-in items are drawn with CSS (class = item code, see index.css).
// The same codes are seeded into the database by SYMBIOTES_PHASE6_STYLE.sql. Admin-uploaded items (video backdrops, custom titles) live only in the database. 'bd_myvideo' lets a member upload their own video backdrop.
export type Slot = 'frame' | 'namefx' | 'backdrop' | 'aura' | 'card' | 'title'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type Item = { code: string; slot: Slot; name: string; rarity: Rarity; desc: string; free?: boolean; img?: string; media?: string | null; poster?: string | null; kind?: 'video' | 'image' | null; custom?: boolean }
export type Equip = { frame: string; namefx: string; backdrop: string; aura: string; card: string; title: string; status: string; bg_media?: string | null; bg_poster?: string | null; bg_kind?: string | null }

export const SLOTS: { id: Slot; label: string; icon: string; hint: string }[] = [
  { id: 'frame', label: 'Frame', icon: '◎', hint: 'The ring around your photo' },
  { id: 'namefx', label: 'Name', icon: 'Aa', hint: 'How your name shines' },
  { id: 'backdrop', label: 'Backdrop', icon: '▣', hint: 'Banner behind your profile (video backdrops move!)' },
  { id: 'aura', label: 'Aura', icon: '✦', hint: 'Floating light around your card' },
  { id: 'card', label: 'Card', icon: '▤', hint: 'The finish of the whole profile, like the Golden Profile' },
  { id: 'title', label: 'Title', icon: '♛', hint: 'A badge of honour under your name' },
]
export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: '#A8A3B8' }, rare: { label: 'Rare', color: '#60A5FA' }, epic: { label: 'Epic', color: '#C084FC' }, legendary: { label: 'Legendary', color: '#FBBF24' },
}
export const DEFAULT_EQUIP: Equip = { frame: 'fr_plain', namefx: 'nm_plain', backdrop: 'bd_night', aura: 'au_none', card: 'cd_glass', title: 'tt_none', status: '' }

const I = (slot: Slot, code: string, name: string, rarity: Rarity, desc: string, extra: Partial<Item> = {}): Item => ({ slot, code, name, rarity, desc, ...extra })
export const BUILTIN: Item[] = [
  // frames
  I('frame', 'fr_plain', 'Classic Ring', 'common', 'A clean violet ring.', { free: true }),
  I('frame', 'fr_bronze', 'Bronze Ring', 'common', 'Warm bronze, your first shine.'),
  I('frame', 'fr_silver', 'Silver Ring', 'common', 'Cool polished silver.'),
  I('frame', 'fr_amethyst', 'Amethyst Ring', 'rare', 'Deep violet crystal glow.'),
  I('frame', 'fr_gold', 'Golden Frame', 'epic', 'A slowly shimmering gold ring.'),
  I('frame', 'fr_diamond', 'Diamond Frame', 'epic', 'Ice-white diamond sparkle.'),
  I('frame', 'fr_ember', 'Ember Ring', 'epic', 'A ring of living flame.'),
  I('frame', 'fr_aurora', 'Aurora Ring', 'legendary', 'Northern lights circling your photo.'),
  I('frame', 'fr_royal', 'Royal Crown', 'legendary', 'Gold ring with a crown on top.'),
  // names
  I('namefx', 'nm_plain', 'Plain Name', 'common', 'Simple white.', { free: true }),
  I('namefx', 'nm_silver', 'Silver Script', 'common', 'Soft silver gradient.'),
  I('namefx', 'nm_amethyst', 'Amethyst Name', 'rare', 'Violet to rose gradient.'),
  I('namefx', 'nm_frost', 'Frost Name', 'rare', 'Icy white to sky blue.'),
  I('namefx', 'nm_gold', 'Golden Name', 'epic', 'Shimmering liquid gold.'),
  I('namefx', 'nm_ember', 'Ember Name', 'epic', 'Fire orange to red.'),
  I('namefx', 'nm_aurora', 'Aurora Name', 'legendary', 'Colours that slowly drift.'),
  I('namefx', 'nm_royal', 'Royal Glow', 'legendary', 'Gold lettering with a glow.'),
  // backdrops
  I('backdrop', 'bd_night', 'Midnight', 'common', 'Deep violet night.', { free: true }),
  I('backdrop', 'bd_nebula', 'Nebula', 'rare', 'Soft purple and rose clouds.'),
  I('backdrop', 'bd_ember', 'Cinder', 'rare', 'Smouldering red and orange.'),
  I('backdrop', 'bd_gold', 'Gilded', 'epic', 'Rich flowing gold.'),
  I('backdrop', 'bd_aurora', 'Northern Lights', 'epic', 'Slow moving green and violet light.'),
  I('backdrop', 'bd_stars', 'Starfall', 'legendary', 'A twinkling star field.'),
  I('backdrop', 'bd_myimage', 'My Picture Backdrop', 'rare', 'Use your own picture as your profile background. Free for everyone.', { free: true }),
  I('backdrop', 'bd_myvideo', 'My Video Backdrop', 'legendary', 'Upload your own looping video as your profile background.'),
  // auras
  I('aura', 'au_none', 'No Aura', 'common', 'Clean and quiet.', { free: true }),
  I('aura', 'au_violet', 'Violet Haze', 'rare', 'A gentle pulsing glow.'),
  I('aura', 'au_snow', 'Soft Snow', 'rare', 'Snowflakes drift down.'),
  I('aura', 'au_sparkle', 'Gold Sparkle', 'epic', 'Golden sparks rise and fade.'),
  I('aura', 'au_embers', 'Rising Embers', 'epic', 'Warm embers float upward.'),
  I('aura', 'au_stars', 'Starlight', 'legendary', 'Little stars twinkle all around.'),
  // cards
  I('card', 'cd_glass', 'Glass', 'common', 'The standard frosted glass.', { free: true }),
  I('card', 'cd_obsidian', 'Obsidian', 'rare', 'Black stone with a violet edge.'),
  I('card', 'cd_amethyst', 'Amethyst', 'rare', 'Violet tinted card.'),
  I('card', 'cd_emerald', 'Emerald', 'rare', 'Deep green card.'),
  I('card', 'cd_rose', 'Rose', 'rare', 'Rose pink card.'),
  I('card', 'cd_ice', 'Glacier', 'rare', 'Cold blue card.'),
  I('card', 'cd_gold', 'Golden Profile', 'legendary', 'The whole profile in gold: border, glow and accents.'),
  // titles (the item name is the text shown)
  I('title', 'tt_none', 'No Title', 'common', 'Show no title.', { free: true }),
  I('title', 'tt_rookie', 'Rookie', 'common', 'Everyone starts somewhere.'),
  I('title', 'tt_regular', 'Regular', 'common', 'Always around.'),
  I('title', 'tt_veteran', 'Veteran', 'rare', 'Seen it all.'),
  I('title', 'tt_strategist', 'Strategist', 'rare', 'Plans win games.'),
  I('title', 'tt_recruiter', 'Recruiter', 'rare', 'Brought new blood.'),
  I('title', 'tt_champion', 'Champion', 'epic', 'Tournament level.'),
  I('title', 'tt_mvp', 'Weekly MVP', 'epic', 'Best of the week.'),
  I('title', 'tt_legend', 'Legend', 'legendary', 'Talked about for years.'),
  I('title', 'tt_vip', 'VIP', 'legendary', 'Given by the admins.'),
  I('title', 'tt_founder', 'Founder', 'legendary', 'Only for the founders.'),
]
export const BUILTIN_MAP = new Map(BUILTIN.map(i => [i.code, i]))
export const itemOf = (code: string | null | undefined, extra?: Map<string, Item>): Item | undefined => (code ? BUILTIN_MAP.get(code) ?? extra?.get(code) : undefined)
export const nameOfTitle = (code: string, extra?: Map<string, Item>) => (code === 'tt_none' ? '' : itemOf(code, extra)?.name ?? '')
export const rarityRank = (r: Rarity) => ({ common: 0, rare: 1, epic: 2, legendary: 3 }[r])
export const normEquip = (e?: Partial<Equip> | null): Equip => ({ ...DEFAULT_EQUIP, ...Object.fromEntries(Object.entries(e ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')) } as Equip)
/** Score used to sort "fanciest profile first". */
export const flex = (e: Equip, extra?: Map<string, Item>) => (['frame', 'namefx', 'backdrop', 'aura', 'card', 'title'] as Slot[]).reduce((n, s) => { const it = itemOf(e[s], extra); return n + (it && !it.free ? 1 + rarityRank(it.rarity) : 0) }, 0)

// Quest metrics the database can measure by itself
export const METRICS: { id: string; label: string; unit: string }[] = [
  { id: 'photo', label: 'Profile photo added', unit: '' },
  { id: 'bio', label: 'Bio written (10+ letters)', unit: '' },
  { id: 'game_id', label: 'Game ID and in-game name added', unit: '' },
  { id: 'visit_days', label: 'Different days visited', unit: 'days' },
  { id: 'streak', label: 'Visit streak (days in a row)', unit: 'days' },
  { id: 'weekly_glory', label: 'Glory this week', unit: 'glory' },
  { id: 'best_week', label: 'Best weekly glory ever', unit: 'glory' },
  { id: 'lifetime_glory', label: 'Lifetime glory', unit: 'glory' },
  { id: 'badges', label: 'Achievement badges earned', unit: 'badges' },
  { id: 'polls', label: 'Polls voted in', unit: 'votes' },
  { id: 'messages', label: 'Chat messages sent', unit: 'messages' },
]
export const metricLabel = (id: string) => METRICS.find(m => m.id === id)?.label ?? id
