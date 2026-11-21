// Soft generated night-ambience (no audio file needed). Starts muted; created on the first tap of the sound button.
export function createAmbient() {
  let ctx: AudioContext | null = null; let master: GainNode; let lp: BiquadFilterNode
  const start = () => {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return
    ctx = new AC() as AudioContext
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800
    master = ctx.createGain(); master.gain.value = 0; lp.connect(master); master.connect(ctx.destination)
    ;[110, 164.81, 220, 277.18, 329.63].forEach((f, i) => {
      const o = ctx!.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 2) * 7
      const g = ctx!.createGain(); g.gain.value = 0.1
      const lfo = ctx!.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03
      const lg = ctx!.createGain(); lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain)
      o.connect(g); g.connect(lp); o.start(); lfo.start()
    })
  }
  return {
    setOn(on: boolean) {
      if (!ctx) start(); if (!ctx) return
      void ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.5)
    },
    muffle(on: boolean) { if (ctx) lp.frequency.setTargetAtTime(on ? 260 : 1800, ctx.currentTime, 0.4) },
    dispose() { if (ctx) void ctx.close(); ctx = null },
  }
}
