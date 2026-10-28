import soundsJson from '../data/sounds.json';
import { assetUrl } from './assets';

// Plays recorded sound files from assets/sounds (listed in src/data/sounds.json). Nothing is
// synthesized: a cue with no file yet stays silent. Phones only allow audio after a touch, so
// the context starts on the first tap; it suspends while the app is hidden to save battery.

export type Cue = 'door-chime' | 'footsteps' | 'glass' | 'pouring' | 'paper' | 'crate' | 'ambience';

interface CueData {
  file: string | null;
  volume: number;
  loop: boolean;
  search: string;
  duration: [number, number];
}

const cues = (soundsJson as unknown as { cues: Record<Cue, CueData> }).cues;

export class SoundBoard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<Cue, Promise<AudioBuffer | null>>();
  private readonly loops = new Map<Cue, AudioBufferSourceNode>();
  private readonly wanted = new Set<Cue>();
  private level: number;

  constructor(volume: number) {
    this.level = volume;
    const start = () => this.start();
    window.addEventListener('pointerdown', start, { once: true, capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.context) return;
      if (document.hidden) void this.context.suspend();
      else void this.context.resume();
    });
  }

  get volume(): number {
    return this.level;
  }

  set volume(value: number) {
    this.level = value;
    if (this.master) this.master.gain.value = value;
  }

  /** Plays a one-off cue. */
  play(cue: Cue): void {
    if (!this.context || this.level === 0) return;
    void this.buffer(cue).then((buffer) => buffer && this.source(cue, buffer).start());
  }

  /** Starts or stops a looping cue (footsteps, ambience). */
  loop(cue: Cue, on: boolean): void {
    if (on) this.wanted.add(cue);
    else this.wanted.delete(cue);
    if (!on) {
      this.loops.get(cue)?.stop();
      this.loops.delete(cue);
      return;
    }
    if (!this.context || this.loops.has(cue)) return;
    void this.buffer(cue).then((buffer) => {
      if (!buffer || !this.wanted.has(cue) || this.loops.has(cue)) return;
      const source = this.source(cue, buffer);
      source.loop = true;
      source.start();
      this.loops.set(cue, source);
    });
  }

  private start(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.level;
    this.master.connect(this.context.destination);
    for (const cue of this.wanted) this.loop(cue, true);
  }

  private source(cue: Cue, buffer: AudioBuffer): AudioBufferSourceNode {
    const gain = this.context!.createGain();
    gain.gain.value = cues[cue].volume;
    gain.connect(this.master!);
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    return source;
  }

  private buffer(cue: Cue): Promise<AudioBuffer | null> {
    let promise = this.buffers.get(cue);
    if (!promise) {
      const file = cues[cue]?.file;
      promise = file
        ? fetch(assetUrl(file))
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${file}: ${r.status}`))))
            .then((data) => this.context!.decodeAudioData(data))
            .catch((e) => {
              console.warn('Sound not loaded', e);
              return null;
            })
        : Promise.resolve(null);
      this.buffers.set(cue, promise);
    }
    return promise;
  }
}
