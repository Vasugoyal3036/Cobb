import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSoundSettings, saveSoundSettings, speakCheckoutVoice, playCheckoutChime } from './sound';

describe('Feature 6: Audio Sound Box & Voice Confirmation System', () => {

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  });

  it('reads default sound and voice settings as enabled', () => {
    const settings = getSoundSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.voiceEnabled).toBe(true);
  });

  it('persists sound preferences in localStorage', () => {
    saveSoundSettings({ soundEnabled: false, voiceEnabled: true });
    expect(getSoundSettings().soundEnabled).toBe(false);

    saveSoundSettings({ soundEnabled: true, voiceEnabled: false });
    expect(getSoundSettings().voiceEnabled).toBe(false);
  });

  it('triggers speech synthesis with rupee amount and payment mode', () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: vi.fn().mockReturnValue([])
    };

    speakCheckoutVoice({ amount: 3450, paymentMode: 'UPI' });

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Rupees 3,450 received via UPI');
  });

  it('formats large transaction amounts cleanly with Indian comma separators', () => {
    const mockSpeak = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([])
    };

    speakCheckoutVoice({ amount: 125000, paymentMode: 'Cash' });

    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Rupees 1,25,000 received via Cash');
  });

  it('does not speak if amount is 0 or negative', () => {
    const mockSpeak = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([])
    };

    speakCheckoutVoice({ amount: 0, paymentMode: 'UPI' });
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
