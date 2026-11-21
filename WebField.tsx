import { useEffect, useRef } from 'react'

// Legendary spider-web background, drawn on one canvas (no files, no WebGL, works on every phone).
// - a big silver web breathes and sways in the wind; strands near your finger / pointer bend toward it and glow
// - a small spider hangs on a thread that lengthens as you scroll
// - `fire` makes the whole web flare up (used when the visitor reaches for the Join button)
// - `dim` is the calm, darker version used behind the member pages; `play` starts the fade-in
const SPOKES = 16
const mk = (w: number, h: number) => Object.assign(document.createElement('canvas'), { width: w, height: h })

export function WebField({ play = true, fire = false, dim = false }: { play?: boolean; fire?: boolean; dim?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const st = useRef({ play, fire, dim }); st.current.play = play; st.current.fire = fire; st.current.dim = dim

  useEffect(() => {
    const canvas = cv.current!; const g = canvas.getContext('2d', { alpha: false }); if (!g) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const small = innerWidth < 820 || matchMedia('(pointer: coarse)').matches
    const RINGS = st.current.dim ? 8 : small ? 10 : 14
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0
    const ptr = { x: -9999, y: -9999, on: 0 }
    let fade = reduce ? 1 : 0, flare = 0, raf = 0, last = 0, visible = true
    const motes = Array.from({ length: small ? 28 : 60 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2, p: Math.random() * 6 }))
    // tiny spider sprite from the emblem picture (optional; the web works without it)
    let spr: HTMLCanvasElement | null = null
    const img = new Image(); img.src = '/intro/spider.webp'
    img.onload = () => { const s = mk(96, 90); const c = s.getContext('2d')!; c.drawImage(img, 0, 0, 96, 90); spr = s }

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2); W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = W * 0.5; cy = H * (st.current.dim ? 0.46 : 0.44); R = Math.hypot(W, H) * (st.current.dim ? 0.62 : 0.56)
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize()
    const onMove = (e: PointerEvent) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = 1 }
    const onUp = (e: PointerEvent) => { if (e.pointerType === 'touch') { ptr.x = -9999; ptr.y = -9999 } }
    addEventListener('pointermove', onMove, { passive: true }); addEventListener('pointerdown', onMove, { passive: true }); addEventListener('pointerup', onUp, { passive: true })
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }); io.observe(canvas)

    // vertex of the web at ring r, spoke s, with wind sway + pointer pull
    const vert = (r: number, s: number, t: number, sc: number, rot: number) => {
      const k = (r + 1) / RINGS; const rad = R * Math.pow(k, 1.35) * sc
      const a = (s / SPOKES) * Math.PI * 2 + rot + Math.sin(t * 0.00035 + k * 3) * 0.012
      let x = cx + Math.cos(a) * rad + Math.sin(t * 0.0006 + s + r) * 3 * k
      let y = cy + Math.sin(a) * rad * 0.9 + Math.cos(t * 0.0005 + s * 2 + r) * 3 * k
      const dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy), reach = 150
      let glow = 0
      if (d < reach) { const f = (1 - d / reach); x += dx * f * 0.22; y += dy * f * 0.22; glow = f }
      return [x, y, glow] as const
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = now; return }
      const dt = Math.min(48, now - (last || now)); last = now
      fade = st.current.play ? Math.min(1, fade + dt / 1400) : fade
      flare += ((st.current.fire ? 1 : 0) - flare) * Math.min(1, dt / 220)
      const sy = scrollY, sc = 1 + sy * 0.00028, rot = sy * 0.00012 + now * 0.000012
      const acc = getComputedStyle(document.documentElement).getPropertyValue('--ar').trim() || '154,164,178'
      // base: near-black with a cold centre light
      g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H)
      const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75)
      bg.addColorStop(0, `rgba(${acc},${0.17 + flare * 0.12})`); bg.addColorStop(0.5, 'rgba(10,14,22,.35)'); bg.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = bg; g.fillRect(0, 0, W, H)
      const A = fade * (st.current.dim ? 0.5 : 1)
      const grid: (readonly [number, number, number])[][] = []
      for (let r = 0; r < RINGS; r++) { const row = []; for (let s = 0; s < SPOKES; s++) row.push(vert(r, s, now, sc, rot)); grid.push(row) }
      g.lineCap = 'round'; g.lineJoin = 'round'
      // spokes
      for (let s = 0; s < SPOKES; s++) {
        g.beginPath(); g.moveTo(cx, cy)
        for (let r = 0; r < RINGS; r++) g.lineTo(grid[r][s][0], grid[r][s][1])
        g.strokeStyle = `rgba(214,222,235,${(0.2 + flare * 0.25) * A})`; g.lineWidth = 0.9; g.stroke()
      }
      // rings: sagging threads between neighbouring spokes, brighter near the pointer
      for (let r = 0; r < RINGS; r++) {
        const k = (r + 1) / RINGS
        for (let s = 0; s < SPOKES; s++) {
          const a = grid[r][s], b = grid[r][(s + 1) % SPOKES]
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
          const sag = 0.16 + k * 0.05
          const qx = mx + (cx - mx) * sag, qy = my + (cy - my) * sag + Math.sin(now * 0.0008 + s + r) * 1.2
          const gl = Math.max(a[2], b[2])
          g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(qx, qy, b[0], b[1])
          g.strokeStyle = gl > 0.02 ? `rgba(255,255,255,${(0.28 + gl * 0.7) * A})` : `rgba(190,200,216,${(0.1 + 0.12 * (1 - k) + flare * 0.2) * A})`
          g.lineWidth = gl > 0.02 ? 0.8 + gl * 1.4 : 0.7; g.stroke()
        }
      }
      // dew drops at the junctions
      if (!st.current.dim) for (let r = 1; r < RINGS; r += 2) for (let s = 0; s < SPOKES; s += 2) {
        const p = grid[r][s]; const tw = 0.5 + 0.5 * Math.sin(now * 0.002 + s * 1.7 + r)
        g.fillStyle = `rgba(235,242,255,${(0.1 + tw * 0.35 + p[2]) * A})`; g.beginPath(); g.arc(p[0], p[1], 1 + p[2] * 2, 0, 7); g.fill()
      }
      // drifting motes
      for (const m of motes) {
        m.y -= dt * 0.00004 * m.z; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random() }
        const x = (m.x + Math.sin(now * 0.0003 + m.p) * 0.015) * W, y = m.y * H
        g.fillStyle = `rgba(220,228,245,${0.1 + 0.25 * m.z * A})`; g.fillRect(x, y, 1.4 * m.z + 0.4, 1.4 * m.z + 0.4)
      }
      // hanging spider (hero only)
      if (!st.current.dim && spr) {
        const len = Math.min(H * 0.5, 60 + sy * 0.35) + Math.sin(now * 0.0011) * 7; const sx = W * (small ? 0.86 : 0.9) + Math.sin(now * 0.0007) * 4
        g.strokeStyle = `rgba(220,228,245,${0.5 * A})`; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, len); g.stroke()
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9 * A; g.drawImage(spr, sx - 22, len, 44, 41); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
      }
      // vignette
      const v = g.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.35, cx, H * 0.5, Math.max(W, H) * 0.8)
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = v; g.fillRect(0, 0, W, H)
      if (reduce) cancelAnimationFrame(raf)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onMove); removeEventListener('pointerup', onUp) }
  }, [])
  return <canvas ref={cv} className="f3d" aria-hidden="true" />
}
