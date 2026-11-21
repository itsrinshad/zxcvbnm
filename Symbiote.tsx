// Calm static background + brand mark used on every page (no moving blobs).
export function SymbioteBg() { return <div className="site-bg" aria-hidden="true" /> }

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="sym-logo" style={{ fontSize: size }}>
      <img src="/intro/emblem.webp" alt="" width={size * 1.25} height={size * 1.18} />
      <b>SYMBIOTES</b>
    </span>
  )
}
