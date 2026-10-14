/**
 * Audio Sound Box & Chime System for Cobb POS Counter
 * Uses Web Audio API for synthetic offline chimes and Web Speech API for voice checkout confirmations.
 */

const STORAGE_KEY_SOUND = 'cobb_pos_sound_enabled';
const STORAGE_KEY_VOICE = 'cobb_pos_voice_enabled';
export const STORAGE_KEY_SOUNDBOX = 'cobb_soundbox_config_v2';
export const STORAGE_KEY_LAST_BILL = 'cobb_last_checkout_bill';

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

export const getSoundboxSettings = () => {
  const legacy = getSoundSettings();
  if (typeof window === 'undefined') {
    return {
      soundEnabled: true,
      voiceEnabled: true,
      mode: 'voice_and_chime',
      language: 'hinglish',
      speechRate: 1.0,
      speechPitch: 1.0,
      volume: 1.0,
      announceStoreName: true,
      announceStaffName: true,
      announceMode: true,
      minAmount: 0,
      selectedVoiceURI: ''
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOUNDBOX);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        soundEnabled: legacy.soundEnabled,
        voiceEnabled: legacy.voiceEnabled,
        mode: parsed.mode || 'voice_and_chime',
        language: parsed.language || 'hinglish',
        speechRate: Number(parsed.speechRate || 1.0),
        speechPitch: Number(parsed.speechPitch || 1.0),
        volume: Number(parsed.volume !== undefined ? parsed.volume : 1.0),
        announceStoreName: parsed.announceStoreName !== undefined ? Boolean(parsed.announceStoreName) : true,
        announceStaffName: parsed.announceStaffName !== undefined ? Boolean(parsed.announceStaffName) : true,
        announceMode: parsed.announceMode !== undefined ? Boolean(parsed.announceMode) : true,
        minAmount: Number(parsed.minAmount || 0),
        selectedVoiceURI: parsed.selectedVoiceURI || ''
      };
    }
  } catch (e) {}

  // Fallback default preserving legacy test format
  return {
    soundEnabled: legacy.soundEnabled,
    voiceEnabled: legacy.voiceEnabled,
    mode: 'voice_and_chime',
    language: 'english',
    speechRate: 1.05,
    speechPitch: 1.0,
    volume: 1.0,
    announceStoreName: false,
    announceStaffName: false,
    announceMode: true,
    minAmount: 0,
    selectedVoiceURI: ''
  };
};

export const saveSoundboxSettings = (updates = {}) => {
  if (typeof window === 'undefined') return updates;
  const current = getSoundboxSettings();
  const next = { ...current, ...updates };

  if (typeof updates.soundEnabled === 'boolean' || typeof updates.voiceEnabled === 'boolean') {
    saveSoundSettings({
      soundEnabled: updates.soundEnabled !== undefined ? updates.soundEnabled : current.soundEnabled,
      voiceEnabled: updates.voiceEnabled !== undefined ? updates.voiceEnabled : current.voiceEnabled
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_SOUNDBOX, JSON.stringify(next));
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('cobb_soundbox_settings_updated', { detail: next }));
  return next;
};

export const saveLastCheckout = (bill) => {
  if (typeof window === 'undefined' || !bill) return;
  try {
    const data = {
      amount: Number(bill.amount || bill.finalPayable || 0),
      paymentMode: bill.paymentMode || bill.payMode || 'UPI',
      staffName: bill.staffName || bill.salesperson || '',
      customerName: bill.customerName || bill.FirstName || '',
      billNumber: bill.billNumber || bill.billNo || '',
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_LAST_BILL, JSON.stringify(data));
  } catch (e) {}
};

export const getLastCheckout = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_BILL);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
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
 * Text-to-speech counter announcement (Soundbox mode V2)
 * Supports Hindi, Hinglish, English, Replay, Staff Credit, and Custom broadcasts.
 */
export const speakCheckoutVoice = ({
  amount,
  paymentMode = 'UPI',
  staffName = '',
  customerName = '',
  billNumber = '',
  isReplay = false,
  customText = null
}) => {
  const settings = getSoundboxSettings();
  if (!settings.voiceEnabled || settings.mode === 'muted' || settings.mode === 'chime_only') {
    return;
  }
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any prior speech
    const cleanAmount = Math.round(Number(amount || 0));
    if (cleanAmount <= 0 && !customText) return;

    if (cleanAmount > 0) {
      saveLastCheckout({
        amount: cleanAmount,
        paymentMode,
        staffName,
        customerName,
        billNumber
      });
    }

    if (cleanAmount > 0 && cleanAmount < (settings.minAmount || 0)) {
      return;
    }

    let spokenText = '';
    if (customText) {
      spokenText = customText;
    } else if (settings.language === 'hindi') {
      const prefix = isReplay ? 'Dobara suchna: ' : '';
      const store = settings.announceStoreName ? 'Cobb Pundri mein ' : '';
      const modeText = settings.announceMode ? ` ${paymentMode} ke madhyam se` : '';
      const staffText = (settings.announceStaffName && staffName) ? `. Salesperson ${staffName}` : '';
      spokenText = `${prefix}${store}Rupees ${cleanAmount.toLocaleString('en-IN')} praapt hue${modeText}${staffText}`;
    } else if (settings.language === 'hinglish') {
      const prefix = isReplay ? 'Repeat: ' : '';
      const store = settings.announceStoreName ? 'Cobb Pundri: ' : '';
      const modeText = settings.announceMode ? ` received on ${paymentMode}` : ' received';
      const staffText = (settings.announceStaffName && staffName) ? `. Billed by ${staffName}` : '';
      spokenText = `${prefix}${store}Rupees ${cleanAmount.toLocaleString('en-IN')}${modeText}${staffText}`;
    } else {
      // Classic English (exact string matches unit tests)
      const prefix = isReplay ? 'Repeat announcement: ' : '';
      const store = settings.announceStoreName ? 'Cobb Pundri: ' : '';
      const staffText = (settings.announceStaffName && staffName) ? `. Billed by ${staffName}` : '';
      spokenText = `${prefix}${store}Rupees ${cleanAmount.toLocaleString('en-IN')} received via ${paymentMode}${staffText}`;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = Number(settings.speechRate || 1.0);
    utterance.pitch = Number(settings.speechPitch || 1.0);
    utterance.volume = Number(settings.volume !== undefined ? settings.volume : 1.0);

    // Voice selector logic
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (settings.selectedVoiceURI) {
        const customVoice = voices.find(v => v.voiceURI === settings.selectedVoiceURI);
        if (customVoice) utterance.voice = customVoice;
      }
      if (!utterance.voice) {
        if (settings.language === 'hindi') {
          const hiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
          if (hiVoice) utterance.voice = hiVoice;
        }
        if (!utterance.voice) {
          const indianVoice = voices.find(v => v.lang === 'en-IN' || v.lang.includes('IN'));
          if (indianVoice) utterance.voice = indianVoice;
        }
      }
    }

    // Dispatch UI event for LED glow and speech bubble
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cobb_soundbox_speaking', {
        detail: {
          spokenText,
          amount: cleanAmount,
          paymentMode,
          staffName,
          isReplay
        }
      }));

      utterance.onend = () => {
        window.dispatchEvent(new CustomEvent('cobb_soundbox_idle'));
      };
      utterance.onerror = () => {
        window.dispatchEvent(new CustomEvent('cobb_soundbox_idle'));
      };
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {}
};

/**
 * Replays the last checkout transaction with 1-click or Alt+R
 */
export const replayLastCheckout = () => {
  const last = getLastCheckout();
  playCheckoutChime();
  setTimeout(() => {
    if (!last || !last.amount) {
      speakCheckoutVoice({
        amount: 2499,
        paymentMode: 'UPI',
        staffName: 'Simran',
        isReplay: true
      });
    } else {
      speakCheckoutVoice({
        ...last,
        isReplay: true
      });
    }
  }, 350);
};

/**
 * Tiered audio orchestration based on checkout value
 * - Normal (< ₹3,000): Standard Chime + Voice
 * - High Value (₹3,000 - ₹9,999): Cash Register Ka-Ching + Voice
 * - Jackpot (>= ₹10,000): Vegas Jackpot Chime Cascade + Voice
 */
export const triggerCheckoutAudio = ({
  amount = 0,
  paymentMode = 'UPI',
  staffName = '',
  customerName = '',
  billNumber = ''
}) => {
  const cleanAmt = Math.round(Number(amount || 0));
  const settings = getSoundboxSettings();
  if (settings.mode === 'muted') return;

  if (settings.soundEnabled && settings.mode !== 'voice_only') {
    if (cleanAmt >= 10000) {
      playJackpotChime();
    } else if (cleanAmt >= 3000) {
      playCashRegisterChaching();
    } else {
      playCheckoutChime();
    }
  }

  if (settings.voiceEnabled && settings.mode !== 'chime_only' && cleanAmt > 0) {
    const delay = cleanAmt >= 10000 ? 750 : (cleanAmt >= 3000 ? 500 : 350);
    setTimeout(() => {
      speakCheckoutVoice({
        amount: cleanAmt,
        paymentMode,
        staffName,
        customerName,
        billNumber
      });
    }, delay);
  }
};

/**
 * Store Floor Audio Tannoy / Broadcast Presets
 */
export const speakStoreBroadcast = (type = 'welcome', customText = '') => {
  const PRESETS = {
    welcome: 'Welcome to Cobb Pundri. Explore our latest collection of premium shirts, blazers, and denims with special seasonal offers!',
    offer: 'Attention shoppers: Exclusive store offer at Cobb Pundri today! Buy 3 garments and get 70% off flat. Please ask our staff for assistance.',
    closing: 'Attention valued customers: Cobb Pundri will be closing in 15 minutes. Please bring your selected items to the cash counter for billing.',
    counter_ready: 'Next customer please, billing counter is open and ready for checkout.',
    staff_huddle: 'Floor team attention: Evening rush hour target update. Let us give great service to every walk-in customer!'
  };

  const textToSpeak = customText || PRESETS[type] || PRESETS.welcome;
  playCheckoutChime();
  setTimeout(() => {
    speakCheckoutVoice({
      amount: 0,
      customText: textToSpeak
    });
  }, 450);
};

/**
 * Triumphant 4-note victory fanfare for Target Milestones (50%, 75%, 100%)
 * C5 -> E5 -> G5 -> C6 with warm harmonics and brass synth sparkle
 */
export const playMilestoneFanfare = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();

    const notes = [
      { freq: 523.25, start: 0, dur: 0.14 },    // C5
      { freq: 659.25, start: 0.12, dur: 0.14 },   // E5
      { freq: 783.99, start: 0.24, dur: 0.18 },   // G5
      { freq: 1046.50, start: 0.40, dur: 0.55 }   // C6 High Triumph
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const noteStart = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.01, noteStart);
      gain.gain.linearRampToValueAtTime(0.32, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + dur);
    });
  } catch (e) {}
};

/**
 * Arcade Slot Machine Jackpot Chime & Coin Cascade
 */
export const playJackpotChime = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();

    // 8 rapid coin pings
    const coinPitches = [987.77, 1174.66, 1318.51, 1567.98, 1760.00, 1975.53, 2093.00, 2637.02];
    coinPitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.055;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.13);
    });

    // Triumphant chord finish
    const chordTime = ctx.currentTime + coinPitches.length * 0.055 + 0.02;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);
      gain.gain.setValueAtTime(0.01, chordTime);
      gain.gain.linearRampToValueAtTime(0.2, chordTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 0.85);
    });
  } catch (e) {}
};

/**
 * Metallic Cash Drawer Slide + Bell Ding (Ka-Ching!)
 */
export const playCashRegisterChaching = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();
    const t = ctx.currentTime;

    // Metallic ratchet clicks
    [0, 0.025, 0.05].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + idx * 250, t + offset);
      gain.gain.setValueAtTime(0.12, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.025);
    });

    // Lingering brass bell ring
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2093.00, t + 0.07);
    bellGain.gain.setValueAtTime(0.01, t + 0.07);
    bellGain.gain.linearRampToValueAtTime(0.35, t + 0.08);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(t + 0.07);
    bellOsc.stop(t + 1.2);
  } catch (e) {}
};

/**
 * Hip-Hop Stadium DJ Airhorn (b-b-b-baaaam!)
 */
export const playAirhorn = (externalCtx = null) => {
  const { soundEnabled } = getSoundSettings();
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = externalCtx || new AudioContextClass();
    const t = ctx.currentTime;

    const blasts = [
      { start: 0, dur: 0.11 },
      { start: 0.14, dur: 0.11 },
      { start: 0.28, dur: 0.42 }
    ];

    blasts.forEach(({ start, dur }) => {
      const blastTime = t + start;
      [466.16, 471.0].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, blastTime);
        osc.frequency.linearRampToValueAtTime(freq * 0.96, blastTime + dur);

        gain.gain.setValueAtTime(0.01, blastTime);
        gain.gain.linearRampToValueAtTime(0.22, blastTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, blastTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(blastTime);
        osc.stop(blastTime + dur);
      });
    });
  } catch (e) {}
};

