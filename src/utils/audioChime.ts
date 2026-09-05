/**
 * Audio Chime Synthesizer
 * Synthesizes a soothing, harmonic Tibetan singing bowl / meditation chime
 * using the browser's native Web Audio API (zero external assets, zero network latency).
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export interface ChimeOptions {
  volume?: number; // 0.0 to 1.0 (default: 0.6)
  pitchMultiplier?: number; // default: 1.0 (528 Hz base)
}

/**
 * Plays a resonant Tibetan singing bowl chime with multi-harmonic shimmer and exponential decay.
 */
export function playGentleChime(options: ChimeOptions = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  const baseFreq = 528 * (options.pitchMultiplier || 1.0); // 528 Hz "Love / Restoration" tone
  const masterVol = Math.max(0.05, Math.min(1.0, options.volume ?? 0.6));

  masterGain.gain.setValueAtTime(masterVol, now);
  masterGain.connect(ctx.destination);

  // Harmonics: [fundamental, octave, perfect fifth, minor overtone]
  const harmonics = [
    { freq: baseFreq, gain: 0.55, detune: 0, decay: 3.2 },
    { freq: baseFreq * 2, gain: 0.28, detune: 2.5, decay: 2.8 },
    { freq: baseFreq * 3, gain: 0.16, detune: -1.8, decay: 2.2 },
    { freq: baseFreq * 0.5, gain: 0.22, detune: 0.8, decay: 3.5 }, // warm sub-harmonic fundamental
  ];

  harmonics.forEach(({ freq, gain, detune, decay }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);

    // Warm envelope: rapid gentle attack to prevent click, exponential decay to emulate brass singing bowl
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.035);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(now);
    osc.stop(now + decay + 0.1);
  });

  // Second soft resonant strike at +0.18s for depth
  const secondStrikeTime = now + 0.18;
  const secondOsc = ctx.createOscillator();
  const secondGain = ctx.createGain();

  secondOsc.type = 'sine';
  secondOsc.frequency.setValueAtTime(baseFreq * 1.5, secondStrikeTime); // 792 Hz
  secondGain.gain.setValueAtTime(0.0001, secondStrikeTime);
  secondGain.gain.exponentialRampToValueAtTime(0.18, secondStrikeTime + 0.04);
  secondGain.gain.exponentialRampToValueAtTime(0.0001, secondStrikeTime + 2.5);

  secondOsc.connect(secondGain);
  secondGain.connect(masterGain);

  secondOsc.start(secondStrikeTime);
  secondOsc.stop(secondStrikeTime + 2.6);
}
