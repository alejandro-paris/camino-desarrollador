
export class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private isMuted: boolean = false;
  private noteIndex: number = 0;

  constructor() {
    // Lazy initialization to respect browser autoplay policies
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Default volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.3, this.ctx!.currentTime, 0.1);
    }
    if (!muted && !this.musicInterval) {
      this.startMusic();
    } else if (muted) {
      this.stopMusic();
    }
  }

  // --- SYNTHESIZER ENGINE ---

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * 2; // 2 seconds
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playNoise(duration: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const noiseGain = this.ctx.createGain();
    
    noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  // --- MUSIC SEQUENCER (Dark Synthwave Bass) ---
  
  public startMusic() {
    this.init();
    if (this.isMuted || this.musicInterval) return;

    const tempo = 200; // ms per note (approx 300 BPM 8th notes)
    // Bassline notes (Deep frequencies)
    const sequence = [
      55, 55, 110, 55,  // A
      55, 55, 110, 55,
      49, 49, 98, 49,   // G
      49, 49, 98, 49,
      41, 41, 82, 41,   // E
      41, 41, 82, 41,
      65, 65, 130, 65,  // C
      61, 61, 123, 61   // B
    ];

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const freq = sequence[this.noteIndex % sequence.length];
      
      // Bass Synth
      this.playTone(freq, 'sawtooth', 0.3, t, 0.3);
      // Sub Bass
      this.playTone(freq / 2, 'sine', 0.4, t, 0.4);

      // Hi-hat mechanic
      if (this.noteIndex % 4 === 2) {
        this.playNoise(0.05); // Snare-ish
      }

      this.noteIndex++;
    }, tempo);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // --- SFX LIBRARY ---

  public playSFX(name: string) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    switch (name) {
      case 'hover':
        this.playTone(800, 'sine', 0.05, t, 0.1);
        break;
      case 'click':
        this.playTone(1200, 'square', 0.1, t, 0.2);
        this.playTone(800, 'square', 0.1, t + 0.05, 0.2);
        break;
      case 'start':
        this.playTone(440, 'square', 0.1, t, 0.3);
        this.playTone(554, 'square', 0.1, t + 0.1, 0.3);
        this.playTone(659, 'square', 0.4, t + 0.2, 0.3);
        break;
      case 'objective':
        this.playTone(880, 'sine', 0.1, t, 0.3);
        this.playTone(1760, 'sine', 0.3, t + 0.1, 0.3);
        break;
      case 'gameover':
        this.playTone(100, 'sawtooth', 0.5, t, 0.5);
        this.playTone(80, 'sawtooth', 0.5, t + 0.4, 0.5);
        this.playTone(60, 'sawtooth', 1.0, t + 0.8, 0.5);
        break;
      case 'win':
        [523, 659, 783, 1046, 783, 1046].forEach((f, i) => {
          this.playTone(f, 'square', 0.2, t + i * 0.1, 0.2);
        });
        break;
      // Tetris
      case 'rotate':
        this.playTone(300, 'triangle', 0.1, t, 0.2);
        break;
      case 'drop':
        this.playTone(150, 'square', 0.1, t, 0.2);
        break;
      case 'line_clear':
        this.playTone(880, 'square', 0.1, t, 0.3);
        this.playTone(1100, 'square', 0.2, t + 0.1, 0.3);
        break;
      // Shooter
      case 'shoot':
        // Laser pew pew (frequency ramp)
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        g.gain.setValueAtTime(0.3, t);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start();
        osc.stop(t + 0.2);
        break;
      case 'explosion':
        this.playNoise(0.3);
        break;
      // Dodge
      case 'hit':
        this.playNoise(0.2);
        this.playTone(100, 'sawtooth', 0.2, t, 0.5);
        break;
    }
  }
}
