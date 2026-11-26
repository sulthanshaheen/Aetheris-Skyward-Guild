/**
 * Aetheris: Skyward Guild — Procedural Web Audio Engine
 * Warm, stylized fantasy-adventure Background Music (3 theme moods)
 * + crisp Sound Effects (parkour, relics, checkpoints, portals, NPCs, emotes, victory).
 * Zero external audio dependencies — plays instantaneously and cleanly in any browser.
 */

const NOTE_FREQ = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51
};

const BGM_THEMES = {
  // Bright, airy sky-island adventure theme (Hub & Golden/Emerald skies)
  skyward: {
    tempoMs: 360,
    melody: [
      'E5', null, 'G5', 'A5', 'G5', null, 'E5', 'D5',
      'C5', null, 'D5', 'E5', 'G5', null, null, null,
      'A5', null, 'G5', 'E5', 'D5', null, 'C5', 'D5',
      'E5', null, 'D5', 'C5', 'C5', null, null, null
    ],
    chords: [
      ['C4', 'E4', 'G4'],
      ['G3', 'B3', 'D4'],
      ['A3', 'C4', 'E4'],
      ['F3', 'A3', 'C4']
    ],
    bass: ['C3', 'G3', 'A3', 'F3']
  },
  // Upbeat heroic quest rhythm (Sunset Citadel & Crimson Dusk)
  citadel: {
    tempoMs: 300,
    melody: [
      'A4', 'C5', 'D5', null, 'E5', 'D5', 'C5', null,
      'G4', 'B4', 'D5', null, 'C5', null, 'A4', null,
      'A4', 'C5', 'E5', null, 'G5', 'E5', 'D5', null,
      'E5', 'D5', 'C5', 'B4', 'A4', null, null, null
    ],
    chords: [
      ['A3', 'C4', 'E4'],
      ['G3', 'B3', 'D4'],
      ['F3', 'A3', 'C4'],
      ['E3', 'G3', 'B3']
    ],
    bass: ['A3', 'G3', 'F3', 'E3']
  },
  // Dreamy shimmering celestial chimes (Twilight Astral)
  astral: {
    tempoMs: 410,
    melody: [
      'B5', null, 'G5', null, 'Fs5', null, 'E5', null,
      'D5', 'E5', 'G5', null, 'B5', null, null, null,
      'A5', null, 'G5', null, 'E5', null, 'D5', null,
      'E5', null, 'Fs5', 'G5', 'E5', null, null, null
    ],
    chords: [
      ['E4', 'G4', 'B4'],
      ['C4', 'E4', 'G4'],
      ['D4', 'Fs5', 'A4'],
      ['B3', 'D4', 'Fs5']
    ],
    bass: ['E3', 'C3', 'D3', 'B3']
  }
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;

    this.muted = localStorage.getItem('aetheris_muted') === '1';
    this.unlocked = false;
    this.currentThemeKey = 'skyward';
    this.bgmStep = 0;
    this.bgmTimer = null;
    this.noiseBuffer = null;

    this._bindAutoUnlock();
  }

  _bindAutoUnlock() {
    const unlock = () => {
      this.ensureReady();
      if (this.unlocked) {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  ensureReady() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.28;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.78;
      this.sfxGain.connect(this.masterGain);

      // Pre-build soft white noise buffer for wind/whoosh/footstep SFX
      const sampleRate = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sampleRate * 1.2, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.unlocked = true;
    if (!this.bgmTimer) {
      this._startBgmLoop();
    }
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('aetheris_muted', this.muted ? '1' : '0');
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.05);
    } else if (!this.muted) {
      this.ensureReady();
    }
    return this.muted;
  }

  setWorldTheme(envTheme) {
    let next = 'skyward';
    if (envTheme === 'sunset_citadel' || envTheme === 'crimson_dusk') next = 'citadel';
    else if (envTheme === 'twilight_astral') next = 'astral';

    if (next !== this.currentThemeKey) {
      this.currentThemeKey = next;
      this.bgmStep = 0;
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
        if (this.unlocked) this._startBgmLoop();
      }
    }
  }

  _startBgmLoop() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    const theme = BGM_THEMES[this.currentThemeKey] || BGM_THEMES.skyward;
    this.bgmTimer = setInterval(() => this._tickBgm(), theme.tempoMs);
  }

  _tickBgm() {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const theme = BGM_THEMES[this.currentThemeKey] || BGM_THEMES.skyward;
    const now = this.ctx.currentTime;
    const step = this.bgmStep % theme.melody.length;

    // 1. Warm atmospheric chord pad every 8 steps
    if (step % 8 === 0) {
      const chordIdx = Math.floor(step / 8) % theme.chords.length;
      const chord = theme.chords[chordIdx];
      const dur = (theme.tempoMs * 8) / 1000;
      for (const noteName of chord) {
        const freq = NOTE_FREQ[noteName];
        if (freq) this._playPadTone(freq, now, dur, 0.085);
      }
      const bassFreq = NOTE_FREQ[theme.bass[chordIdx]];
      if (bassFreq) this._playPluck(bassFreq, now, 0.9, 0.16, 'triangle');
    }

    // 2. Soft harp/celesta melody note
    const melNote = theme.melody[step];
    if (melNote && NOTE_FREQ[melNote]) {
      this._playPluck(NOTE_FREQ[melNote], now, 0.58, 0.22, this.currentThemeKey === 'astral' ? 'sine' : 'triangle');
    }

    // 3. Subtle sparkling arpeggio echo on off-beats
    if (step % 4 === 2) {
      const chordIdx = Math.floor(step / 8) % theme.chords.length;
      const chord = theme.chords[chordIdx];
      const pick = chord[(step / 2) % chord.length];
      const freq = NOTE_FREQ[pick];
      if (freq) this._playPluck(freq * 2, now, 0.35, 0.075, 'sine');
    }

    this.bgmStep += 1;
  }

  _playPadTone(freq, startTime, duration, volume) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _playPluck(freq, startTime, duration, volume, type = 'triangle', dest = null) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3600, freq * 3.5), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.1), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest || this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  _playToneSlide(fStart, fEnd, duration, volume, type = 'sine', delay = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  _playNoiseBurst(duration, volume, filterFreq, endFreq = null) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(filterFreq, now);
    if (endFreq) {
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + duration + 0.03);
  }

  // ======================== GAMEPLAY SFX ========================

  playUiClick() {
    if (!this.ensureReady() || this.muted) return;
    this._playToneSlide(620, 880, 0.08, 0.14, 'triangle');
  }

  playJump() {
    if (!this.ensureReady() || this.muted) return;
    this._playToneSlide(240, 520, 0.14, 0.22, 'sine');
    this._playNoiseBurst(0.11, 0.08, 900, 2200);
  }

  playDoubleJump() {
    if (!this.ensureReady() || this.muted) return;
    this._playToneSlide(420, 920, 0.18, 0.22, 'triangle');
    this._playToneSlide(660, 1320, 0.22, 0.16, 'sine', 0.04);
    this._playNoiseBurst(0.16, 0.11, 1400, 3600);
  }

  playLand() {
    if (!this.ctx || this.muted) return;
    this._playToneSlide(135, 65, 0.09, 0.18, 'triangle');
    this._playNoiseBurst(0.07, 0.08, 380);
  }

  playStep() {
    if (!this.ctx || this.muted) return;
    this._playNoiseBurst(0.045, 0.045, 520 + Math.random() * 240);
  }

  playGeyser() {
    if (!this.ensureReady() || this.muted) return;
    this._playNoiseBurst(0.45, 0.24, 500, 3200);
    this._playToneSlide(280, 980, 0.38, 0.2, 'sine');
    this._playToneSlide(440, 1280, 0.34, 0.14, 'triangle', 0.06);
  }

  playRelic() {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.B5, NOTE_FREQ.E6];
    notes.forEach((f, idx) => {
      this._playPluck(f, now + idx * 0.065, 0.55, 0.3, 'triangle', this.sfxGain);
    });
  }

  playCheckpoint() {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [NOTE_FREQ.C5, NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.C6];
    notes.forEach((f, idx) => {
      this._playPluck(f, now + idx * 0.08, 0.9, 0.28, 'sine', this.sfxGain);
    });
  }

  playSwitch() {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    this._playToneSlide(180, 360, 0.22, 0.24, 'triangle');
    [NOTE_FREQ.D5, NOTE_FREQ.Fs5, NOTE_FREQ.A5, NOTE_FREQ.D6].forEach((f, idx) => {
      this._playPluck(f, now + 0.08 + idx * 0.07, 0.75, 0.24, 'sine', this.sfxGain);
    });
  }

  playPortal() {
    if (!this.ensureReady() || this.muted) return;
    this._playNoiseBurst(0.55, 0.18, 700, 2800);
    this._playToneSlide(330, 880, 0.45, 0.2, 'sine');
    this._playToneSlide(495, 1320, 0.48, 0.15, 'triangle', 0.08);
  }

  playFall() {
    if (!this.ensureReady() || this.muted) return;
    this._playToneSlide(460, 140, 0.35, 0.22, 'triangle');
    this._playNoiseBurst(0.28, 0.14, 1600, 420);
  }

  playVictory() {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    const fanfare = [
      { f: NOTE_FREQ.C5, t: 0.0, d: 0.22 },
      { f: NOTE_FREQ.E5, t: 0.12, d: 0.22 },
      { f: NOTE_FREQ.G5, t: 0.24, d: 0.22 },
      { f: NOTE_FREQ.C6, t: 0.38, d: 0.95 },
      { f: NOTE_FREQ.E5, t: 0.38, d: 0.9 },
      { f: NOTE_FREQ.G5, t: 0.38, d: 0.9 }
    ];
    for (const n of fanfare) {
      this._playPluck(n.f, now + n.t, n.d, 0.28, 'triangle', this.sfxGain);
    }
  }

  playNpcTalk() {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    this._playPluck(NOTE_FREQ.G4, now, 0.18, 0.22, 'sine', this.sfxGain);
    this._playPluck(NOTE_FREQ.C5, now + 0.08, 0.26, 0.22, 'triangle', this.sfxGain);
  }

  playEmote(emoteName) {
    if (!this.ensureReady() || this.muted) return;
    const now = this.ctx.currentTime;
    if (emoteName === 'emote_wave') {
      this._playPluck(NOTE_FREQ.E5, now, 0.25, 0.24, 'sine', this.sfxGain);
      this._playPluck(NOTE_FREQ.A5, now + 0.11, 0.32, 0.24, 'sine', this.sfxGain);
    } else if (emoteName === 'emote_cheer') {
      [NOTE_FREQ.C5, NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.C6].forEach((f, i) => {
        this._playPluck(f, now + i * 0.075, 0.38, 0.26, 'triangle', this.sfxGain);
      });
    } else if (emoteName === 'emote_dance') {
      [NOTE_FREQ.G4, NOTE_FREQ.B4, NOTE_FREQ.D5, NOTE_FREQ.G5, NOTE_FREQ.E5, NOTE_FREQ.G5].forEach((f, i) => {
        this._playPluck(f, now + i * 0.1, 0.26, 0.22, 'triangle', this.sfxGain);
      });
    } else {
      this._playPluck(NOTE_FREQ.D5, now, 0.24, 0.25, 'triangle', this.sfxGain);
      this._playPluck(NOTE_FREQ.A5, now + 0.12, 0.45, 0.26, 'triangle', this.sfxGain);
    }
  }
}
