// Procedural sound effects using Web Audio API — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Firework / sparkle burst sound effect */
export function playFireworkSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Layer 1: Rising whistle
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Layer 2: Burst crackle (noise burst)
    const bufferSize = ctx.sampleRate * 0.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3000, now + 0.25);
    noiseFilter.Q.setValueAtTime(0.8, now);
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.setValueAtTime(0.2, now + 0.25);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(now + 0.25);
    noise.stop(now + 0.75);

    // Layer 3: Sparkle chimes
    [1200, 1600, 2100, 2800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.3 + i * 0.06);
      g.gain.setValueAtTime(0.06, now + 0.3 + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.06);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + 0.3 + i * 0.06);
      osc.stop(now + 0.55 + i * 0.06);
    });
  } catch (e) {
    // Silently fail if audio isn't available
  }
}

/** Demolition / rubble crash sound effect */
export function playDemolishSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Layer 1: Low rumble
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.3);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.9);

    // Layer 2: Impact noise burst
    const bufferSize = ctx.sampleRate * 0.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * (1 + Math.sin(t * 40) * 0.3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2000, now);
    lowpass.frequency.exponentialRampToValueAtTime(200, now + 0.7);
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    noise.connect(lowpass).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.8);

    // Layer 3: Metal creak / debris
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.6);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Silently fail if audio isn't available
  }
}
