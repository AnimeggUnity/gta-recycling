import { HORN_SOUND } from '../config/balance';

/** A sustained dual-tone horn with reed harmonics and a short mechanical attack. */
export function scheduleHorn(context: BaseAudioContext): void {
  const start = context.currentTime;
  const end = start + HORN_SOUND.durationSeconds;
  const gain = context.createGain();
  const peak = HORN_SOUND.volume / HORN_SOUND.frequencies.length;
  gain.gain.setValueAtTime(HORN_SOUND.silenceFloor, start);
  gain.gain.linearRampToValueAtTime(peak, start + HORN_SOUND.attackSeconds);
  gain.gain.setValueAtTime(peak, end - HORN_SOUND.releaseSeconds);
  gain.gain.exponentialRampToValueAtTime(HORN_SOUND.silenceFloor, end);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = HORN_SOUND.lowpassHz; filter.Q.value = HORN_SOUND.resonance;
  gain.connect(filter); filter.connect(context.destination);
  const wave = context.createPeriodicWave(new Float32Array(HORN_SOUND.harmonics.length), new Float32Array(HORN_SOUND.harmonics));
  let remaining = HORN_SOUND.frequencies.length;
  for (const frequency of HORN_SOUND.frequencies) {
    const tone = context.createOscillator(); tone.setPeriodicWave(wave);
    tone.frequency.setValueAtTime(frequency * HORN_SOUND.onsetPitchRatio, start);
    tone.frequency.linearRampToValueAtTime(frequency, start + HORN_SOUND.onsetPitchSeconds);
    tone.connect(gain); tone.start(start); tone.stop(end);
    tone.onended = () => {
      tone.disconnect();
      if (--remaining === 0) { gain.disconnect(); filter.disconnect(); }
    };
  }
}

class HornSound {
  private context?: AudioContext;
  private nextPlayAt = 0;
  public unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }
  public play(): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    if (context.currentTime < this.nextPlayAt) return;
    this.nextPlayAt = context.currentTime + HORN_SOUND.retriggerSeconds;
    scheduleHorn(context);
  }
}
export const hornSound = new HornSound();
