/**
 * AudioNotificationService — luxury chime built with the Web Audio API so the
 * app ships no binary audio dependency. Falls back to /sounds/alert-chime.mp3
 * when the file exists.
 */

type ChimeName = "alert" | "success" | "soft";

const SEQUENCES: Record<ChimeName, number[]> = {
  alert: [880, 1174.7, 1568],
  success: [659.3, 987.8, 1318.5],
  soft: [523.3, 784],
};

class AudioNotificationService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.6;

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value));
  }

  private context(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    return this.ctx;
  }

  /** Must be called from a user gesture on iOS before the first chime. */
  async unlock() {
    const ctx = this.context();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  }

  async play(name: ChimeName = "alert") {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);

    SEQUENCES[name].forEach((freq, index) => {
      const start = now + index * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.75);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.8);
    });
  }
}

export const audioService = new AudioNotificationService();
