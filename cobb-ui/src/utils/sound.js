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
      actorPersona: 'none',
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
        actorPersona: parsed.actorPersona || 'none',
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
    actorPersona: 'none',
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
 * 10-Actor Bollywood Superstar & Comedy Legends Pack
 * Signature voice parameters, catchphrases, jackpot reactions, and tannoy broadcasts.
 */
export const BOLLYWOOD_ACTORS = {
  amitabh: {
    id: 'amitabh',
    name: 'Amitabh Bachchan',
    character: 'Big B / KBC Host',
    avatar: '🎙️',
    category: 'titans',
    pitch: 0.82,
    rate: 0.92,
    chimeType: 'chime',
    tagline: 'Deviyon aur sajjano... Lock kar diya jaye!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Adbhut! Anokha! Deviyon aur sajjano, Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ka maha jackpot checkout! Computer ji, yeh dhanrashi sidhe khate mein lock kiya jaye!`;
      }
      if (isBigBill) {
        return `Deviyon aur sajjano! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ki shandaar payment praapt hui ${paymentMode} dwara. Shubhkaamnaye!`;
      }
      const prefix = isReplay ? 'Dobara suchna: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Deviyon aur sajjano! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} praapt hue ${paymentMode} dwara. Computer ji lock kar diya jaye!${staff}`;
    },
    tannoy: 'Deviyon aur sajjano, Cobb Pundri mein aap sabhi ka hardik swagat hai! Computer ji, Buy 3 Get 70% off flat discount lock kiya jaye!'
  },
  srk: {
    id: 'srk',
    name: 'Shah Rukh Khan',
    character: 'King Khan / Rahul',
    avatar: '👑',
    category: 'titans',
    pitch: 1.05,
    rate: 1.05,
    chimeType: 'chime',
    tagline: 'Rahul... naam toh suna hoga?',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Picture abhi baaki hai mere dost! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ka blockbuster sale! It is all about loving your clothes!`;
      }
      const prefix = isReplay ? 'Repeat: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Rahul... naam toh suna hoga? Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} received via ${paymentMode}. Bade bade deshon mein aisi payments hoti rehti hain, Senorita!${staff}`;
    },
    tannoy: 'Zindagi mein agar style chahiye, toh sirf Cobb Pundri aao! Discount dekh ke dil to pagal hai ho jayega!'
  },
  salman: {
    id: 'salman',
    name: 'Salman Khan',
    character: 'Bhaijaan / Chulbul Pandey',
    avatar: '🕶️',
    category: 'titans',
    pitch: 0.95,
    rate: 1.0,
    chimeType: 'airhorn',
    tagline: 'Ek baar jo commitment kar di...',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Swag se swagat boss! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} ka dabangg sale! Ek baar jo commitment kar di, toh main khud ki bhi nahi sunta!`;
      }
      const prefix = isReplay ? 'Repeat suno: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Swag se swagat! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} receive ho gaye ${paymentMode} par. Ek baar jo commitment kar di, done hai boss!${staff}`;
    },
    tannoy: 'Swag se karenge sabka swagat! Cobb Pundri showroom pe special discount chal raha hai, jaldi counter pe aao!'
  },
  sunny: {
    id: 'sunny',
    name: 'Sunny Deol',
    character: 'Tara Singh / Dhai Kilo Ka Haath',
    avatar: '💥',
    category: 'titans',
    pitch: 0.88,
    rate: 1.05,
    chimeType: 'kaching',
    tagline: 'Tarikh pe tarikh nahi, payment turant!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Oye balle balle! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ka dhai kilo ka checkout! Hindustan zindabad tha, zindabad hai, aur rahega!`;
      }
      const prefix = isReplay ? 'Dobara suniye: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Yeh Cobb Pundri ka haath hai! Tarikh pe tarikh nahi, Rupees ${amount.toLocaleString('en-IN')} ki payment turant confirm ho gayi ${paymentMode} par! Oye balle balle!${staff}`;
    },
    tannoy: 'Oye Pundri walon! Cobb showroom mein flat discount ka halla bol! Tarikh pe tarikh nahi, abhi khareedo!'
  },
  babu_bhaiya: {
    id: 'babu_bhaiya',
    name: 'Paresh Rawal',
    character: 'Babu Bhaiya (Hera Pheri)',
    avatar: '👓',
    category: 'comedy',
    pitch: 1.12,
    rate: 1.08,
    chimeType: 'kaching',
    tagline: 'Utha le re deva... payment utha le!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Aye khopdi phod saale ka! Arre Rupees ${amount.toLocaleString('en-IN')} aagaya re deva! Utha le re baba, seedha khate mein utha le! Chamak gaya apna dhandha!`;
      }
      const prefix = isReplay ? 'Dobara sun re: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Arre deva re deva! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} aagaya re baba ${paymentMode} se! Utha le re deva, payment seedha khate mein!${staff}`;
    },
    tannoy: 'Arre ae Raju, Shyam! Dekho Cobb Pundri pe kitna shandaar offer hai! Chalo jaldi counter pe aao re baba!'
  },
  raju: {
    id: 'raju',
    name: 'Akshay Kumar',
    character: 'Raju (Phir Hera Pheri)',
    avatar: '🕺',
    category: 'comedy',
    pitch: 1.04,
    rate: 1.15,
    chimeType: 'jackpot',
    tagline: 'Zor zor se bolke scheme bata de!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Paisa hi paisa hoga! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} received! Zor zor se bolke sabko scheme bata de! 25 din mein paisa double!`;
      }
      const prefix = isReplay ? 'Repeat scheme: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Zor zor se bolke sabko scheme bata de! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} received on ${paymentMode}. Mast plan hai boss!${staff}`;
    },
    tannoy: 'Paisa hi paisa hoga! Cobb Pundri mein Buy 3 Get 70% offer chal raha hai! Zor zor se bolke sabko scheme bata do!'
  },
  nana: {
    id: 'nana',
    name: 'Nana Patekar',
    character: 'Nana / Uday Shetty',
    avatar: '🎭',
    category: 'comedy',
    pitch: 0.92,
    rate: 1.15,
    chimeType: 'chime',
    tagline: 'Achha hai! Bahut achha hai... Control Uday!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Achha hai! Bahut achha hai! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ki mega entry! Ek machhar... aur yeh jackpot checkout! Ek number!`;
      }
      const prefix = isReplay ? 'Dobara bolta hoon: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Achha hai! Bahut achha hai! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} praapt hue ${paymentMode} par. Control Uday control!${staff}`;
    },
    tannoy: 'Achha hai, bahut achha hai! Cobb Pundri showroom ke kapde dekh kar dil khush ho gaya! Ekdum ek number quality!'
  },
  munna_bhai: {
    id: 'munna_bhai',
    name: 'Sanjay Dutt',
    character: 'Munna Bhai M.B.B.S.',
    avatar: '🩺',
    category: 'comedy',
    pitch: 0.90,
    rate: 0.96,
    chimeType: 'chime',
    tagline: 'Bole toh ekdum jhakas mamu!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Bole toh ekdum jhakas mamu! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} ka bham-bham sale! Circuit, customer ko full samman aur jaadu ki jhappi de re!`;
      }
      const prefix = isReplay ? 'Repeat sun mamu: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Bole toh ekdum jhakas mamu! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} aagayela hai ${paymentMode} se. Customer ko ek jaadu ki jhappi do re!${staff}`;
    },
    tannoy: 'Bole toh tension lene ka nahi, sirf dene ka mamu! Cobb Pundri ke brand new collection pe full discount chalu hai!'
  },
  ranveer: {
    id: 'ranveer',
    name: 'Ranveer Singh',
    character: 'Rocky / High Energy',
    avatar: '⚡',
    category: 'cult',
    pitch: 1.15,
    rate: 1.20,
    chimeType: 'airhorn',
    tagline: 'Booooom! Full power, full energy!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Booooom! Fire on floor boss! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} ki mega dhamaka payment! What energy, kya baat hai boss!`;
      }
      const prefix = isReplay ? 'Once more boss: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Booooom! Full power, full energy boss! Cobb Pundri pe Rupees ${amount.toLocaleString('en-IN')} ki blockbuster entry ho chuki hai ${paymentMode} par!${staff}`;
    },
    tannoy: 'What energy boss! Welcome to Cobb Pundri! Full swag, killer shirts, and bombastic offers wait kar rahe hain!'
  },
  mogambo: {
    id: 'mogambo',
    name: 'Amrish Puri',
    character: 'Mogambo (Mr. India)',
    avatar: '🦹',
    category: 'cult',
    pitch: 0.78,
    rate: 0.88,
    chimeType: 'kaching',
    tagline: 'Mogambo khush hua!',
    formatAnnouncement: ({ amount, paymentMode, staffName, isReplay, isBigBill, isJackpot }) => {
      if (isJackpot) {
        return `Hahaha! Mogambo behad khush hua! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ka aalishan checkout dekh kar... Mogambo khush hua!`;
      }
      const prefix = isReplay ? 'Dobara suno: ' : '';
      const staff = staffName ? `. Billed by ${staffName}` : '';
      return `${prefix}Mogambo khush hua! Cobb Pundri par Rupees ${amount.toLocaleString('en-IN')} ki payment dekh kar ${paymentMode} par... Mogambo khush hua!${staff}`;
    },
    tannoy: 'Mogambo khush hua! Cobb Pundri showroom mein sabse behtareen kapde aur offers dekh kar... Mogambo khush hua!'
  }
};

/**
 * Text-to-speech counter announcement (Soundbox mode V2 with Bollywood Support)
 */
export const speakCheckoutVoice = ({
  amount,
  paymentMode = 'UPI',
  staffName = '',
  customerName = '',
  billNumber = '',
  isReplay = false,
  customText = null,
  overrideActor = null
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

    const activeActorId = overrideActor || settings.actorPersona;
    const actor = (activeActorId && activeActorId !== 'none') ? BOLLYWOOD_ACTORS[activeActorId] : null;

    let spokenText = '';
    let speechPitch = Number(settings.speechPitch || 1.0);
    let speechRate = Number(settings.speechRate || 1.0);

    if (customText) {
      spokenText = customText;
    } else if (actor) {
      const isJackpot = cleanAmount >= 10000;
      const isBigBill = cleanAmount >= 3000;
      spokenText = actor.formatAnnouncement({
        amount: cleanAmount,
        paymentMode,
        staffName,
        isReplay,
        isBigBill,
        isJackpot
      });
      speechPitch = actor.pitch;
      speechRate = actor.rate;
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
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = Number(settings.volume !== undefined ? settings.volume : 1.0);

    // Voice selector logic
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (settings.selectedVoiceURI) {
        const customVoice = voices.find(v => v.voiceURI === settings.selectedVoiceURI);
        if (customVoice) utterance.voice = customVoice;
      }
      if (!utterance.voice) {
        if (actor || settings.language === 'hindi') {
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
          actor: actor ? actor.name : null,
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

