// Financial and Date Formatters & Web Audio Synthesizers for POS

export function formatPaise(paise: number | undefined | null, showSymbol: boolean = true): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return showSymbol ? '₹0.00' : '0.00';
  }
  const rupees = paise / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
}

export function parsePaise(rupees: string | number): number {
  if (typeof rupees === 'number') {
    return Math.round(rupees * 100);
  }
  const clean = rupees.replace(/[^0-9.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.round(val * 100);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)}, ${formatTime(dateString)}`;
}

// Built-in Web Audio API Sound Synthesizer (Zero asset dependencies, 100% offline)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPosSound(type: 'beep' | 'success' | 'error' | 'click') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'beep' || type === 'click') {
      // Soft pleasant high beep for barcode scan or item add
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      // Harmonic 2-tone chime for bill completion
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'error') {
      // Low dual buzz for error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Audio synthesis failure is non-blocking
  }
}
