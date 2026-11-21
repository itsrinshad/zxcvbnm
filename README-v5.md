# SYMBIOTES v5

## Deploy
1. Upload this folder to GitHub (replace the repo contents). Netlify builds it. Deploys > Clear cache and deploy site.
2. Supabase > SQL Editor: run `SYMBIOTES_PHASE7.sql` (after PHASE4, 5, 6). Safe to re-run.
3. Run `SEED_KING_ADMINS.sql` (a separate file, NOT in this folder or on GitHub, it holds passwords). Then delete it.
4. Storage bucket `site-media` must be Public (already used by the intro).
Add `?nointro` to the address to skip the intro while testing.

## v6 changes
- New spider-web theme (default) with the spider emblem; the 3D flower field is removed (Field3D.tsx deleted, WebField.tsx added).
- Landing page and member Home trimmed to short tiles. Added daily streak, Install app button (PWA manifest + icons) and a Share profile button.
- Profile video backdrops now actually play on phones (muted flag, play-on-screen, stall recovery, still-picture fallback). Picture backdrops are free for everyone (run SYMBIOTES_PHASE8.sql).
- The bottom 68px on phones is a SYMBIOTES strip, so Netlify's "Powered by" badge no longer covers buttons (it is added by Netlify and cannot be removed from code).
- Run SQL in this order: PHASE6, PHASE7, PHASE8.

## Netlify privacy-scan warning
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public by design (they ship in every browser bundle). `netlify.toml` tells Netlify's secret scanner to skip those two names. Never use the service_role / secret key in any VITE_ variable.

## What changed
- Visitors page: 3D flower field (camera follows your scroll, depth blur, pointer glow, fireflies on the button), smooth scrolling, recruiting text.
- Member pages: the same field as a calm dark background (off in Settings > Lite mode).
- Intro: full screen on phone and PC, tries to play WITH sound, mute and skip buttons. Admin > Starting animation: Fill screen / Whole picture.
- Profile backdrops: picture backdrops removed. "My Video Backdrop" lets a member upload their own video (max 15 MB).
- King Admins (SYMBIOTS, RIN): every style unlocked and free; only they gift (one style, all styles to one player, one style to everyone), upload custom items and make admins. Nobody else can ever become King Admin (database rule).
- Admins: upload glory, edit website text, add/change/delete quests, review quests, starting animation.
- Glory: rebuilt. No time window, any day can be entered. Weekly glory = sum of daily glory Monday to Saturday - last glory (Admin > Glory > Weekly last glory).

## Where things are
Admin > Glory /admin/glory · Website text /admin/text · Quests and gifts /admin/style · Starting animation /admin/intro
