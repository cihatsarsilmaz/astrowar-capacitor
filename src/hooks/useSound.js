import { useRef, useCallback } from "react";

// ════════════════════════════════════════════════
// useSound — Oyun Ses Efektleri Yöneticisi
// ════════════════════════════════════════════════

const SOUNDS = {
  click:     { freq: 800, type: "sine", duration: 0.05, vol: 0.15 },
  hover:     { freq: 600, type: "sine", duration: 0.03, vol: 0.08 },
  battle:    { freq: 200, type: "sawtooth", duration: 0.3, vol: 0.2 },
  laser:     { freq: 1200, type: "square", duration: 0.1, vol: 0.12 },
  explosion: { freq: 80,  type: "sawtooth", duration: 0.4, vol: 0.25 },
  win:       { freq: 523, type: "sine", duration: 0.3, vol: 0.2 },
  levelUp:   { freq: 880, type: "sine", duration: 0.5, vol: 0.2 },
  error:     { freq: 150, type: "sawtooth", duration: 0.2, vol: 0.15 },
  collect:   { freq: 1000, type: "sine", duration: 0.08, vol: 0.12 },
  notify:    { freq: 700, type: "sine", duration: 0.15, vol: 0.1 },
};

let audioCtx = null;
let masterGain = null;
let enabled = true;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

export function useSound() {
  const ctxRef = useRef(null);

  const play = useCallback((name) => {
    if (!enabled) return;
    initAudio();
    const s = SOUNDS[name];
    if (!s) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq, audioCtx.currentTime);

    // Pitch envelope for explosions
    if (name === "explosion") {
      osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + s.duration);
    }

    gain.gain.setValueAtTime(s.vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + s.duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + s.duration);
  }, []);

  const playSequence = useCallback((names, delay = 80) => {
    names.forEach((n, i) => setTimeout(() => play(n), i * delay));
  }, [play]);

  const setEnabled = useCallback((v) => { enabled = v; }, []);
  const setVolume = useCallback((v) => { 
    if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); 
  }, []);

  return { play, playSequence, setEnabled, setVolume, isEnabled: () => enabled };
}

export { SOUNDS };
