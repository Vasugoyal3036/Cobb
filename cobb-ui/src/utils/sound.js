/**
 * Audio Sound Box & Chime System for Cobb POS Counter
 * Uses Web Audio API for synthetic offline chimes and Web Speech API for voice checkout confirmations.
 */

const STORAGE_KEY_SOUND = 'cobb_pos_sound_enabled';
const STORAGE_KEY_VOICE = 'cobb_pos_voice_enabled';

export const getSoundSettings = () => {
  if (typeof window === 'undefined') return { soundEnabled: true, voiceEnabled: true };
  const soundPref = localStorage.getItem(STORAGE_KEY_SOUND);
  const voicePref = localStorage.getItem(STORAGE_KEY_VOICE);
  return {
    soundEnabled: soundPref === null ? true : soundPref === 'true',
    voiceEnabled: voicePref === null ? true : voicePref === 'true'
  };
};

export const saveSoundSettings = ({ soundEnabled, voiceEnabled }) => {
  if (typeof window === 'undefined') return;
  if (typeof soundEnabled === 'boolean') localStorage.setItem(STORAGE_KEY_SOUND, String(soundEnabled));
  if (typeof voiceEnabled === 'boolean') localStorage.setItem(STORAGE_KEY_VOICE, String(voiceEnabled));
};

export const playSound = (type = 'click') => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'barcode' || type === 'scan') {
      playBarcodeBeep(ctx);
    } else if (type === 'error' || type === 'scan_error') {
      playScanErrorBeep(ctx);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'checkout' || type === 'success') {
      // Harmonic 3-note POS chime (D5 -> A5 -> D6)
      playCheckoutChime(ctx);
    }
  } catch (e) {
    // Ignore autoplay or audio context constraints
  }
};

/**
 * High-speed sharp laser blip sound (Honeywell / Zebra scanner beep emulation)
 * ~2450Hz sine blip for 45ms
 */
export const playBarcodeBeep = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2100, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {}
};

/**
 * Double low warning buzz when barcode is invalid or out of stock
 */
export const playScanErrorBeep = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();

    [0, 0.08].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime + start);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.05);
    });
  } catch (e) {}
};

/**
 * Premium 3-note harmonic chime for checkout
 */
export const playCheckoutChime = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();

    const notes = [
      { freq: 587.33, start: 0, dur: 0.12 },    // D5
      { freq: 880.00, start: 0.10, dur: 0.14 },   // A5
      { freq: 1174.66, start: 0.22, dur: 0.35 }   // D6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const noteStart = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.01, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + dur);
    });
  } catch (e) {}
};

/**
 * Text-to-speech counter announcement (Soundbox mode)
 */
export const speakCheckoutVoice = ({ amount, paymentMode = 'UPI' }) => {
  const { voiceEnabled } = getSoundSettings();
  if (!voiceEnabled) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any prior speech
    const cleanAmount = Math.round(Number(amount || 0));
    if (cleanAmount <= 0) return;

    const spokenText = `Rupees ${cleanAmount.toLocaleString('en-IN')} received via ${paymentMode}`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick English (India) or general English voice if available
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => v.lang === 'en-IN' || v.lang.includes('IN'));
    if (indianVoice) utterance.voice = indianVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {}
};
