import { createClient } from '@supabase/supabase-js'

// Keys come from the build environment (Netlify env vars) OR, for drag-and-drop deploys, from /config.js next to index.html
const rt = ((window as unknown as { __SYM__?: { url?: string; key?: string } }).__SYM__) ?? {}
const clean = (v: string) => v.trim().replace(/^["']|["']$/g, '')
const url = clean(((import.meta.env.VITE_SUPABASE_URL as string | undefined) || rt.url) ?? '').replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '')
const key = clean(((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || rt.key) ?? '')

// SAFETY: a service_role key must never ship to the browser. Detect it (JWT payload role) and refuse to use it.
const isServiceRole = (k: string) => {
  try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role' } catch { return /^sb_secret_/.test(k) }
}
if (key && isServiceRole(key)) console.error('SYMBIOTES: a SECRET (service_role) key was supplied. Use the anon/public key instead and rotate the secret key in Supabase.')

// true only when both values are set, the URL is https, and the key is not a secret key
export const configured = /^https:\/\/[^\s/]+\.[^\s/]+$/.test(url) && key.length > 10 && !isServiceRole(key)

const PLACEHOLDER = ['https://placeholder.invalid', 'placeholder-key'] as const
const make = () => { try { return configured ? createClient(url, key) : createClient(...PLACEHOLDER) } catch { return createClient(...PLACEHOLDER) } }
export const supabase = make()

// Users log in with a USERNAME. Behind the scenes it becomes this fake email.
// (Must match the domain used in SEED_KING_ADMINS.sql / SYMBIOTES_AUTH_UPGRADE.sql)
export const AUTH_DOMAIN = 'symbiotes.app'
export const toEmail = (identifier: string) => {
  const v = identifier.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${AUTH_DOMAIN}`
}
