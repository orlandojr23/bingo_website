// Synthesized notification sounds via the Web Audio API — no audio asset
// files needed. A single lazy AudioContext is shared; browsers start it
// "suspended" until a user gesture, so we resume it on the first
// pointerdown/keydown anywhere and again on every play attempt (a no-op once
// running). If the page has never been interacted with, a sound call simply
// plays nothing rather than throwing.

import { useSyncExternalStore } from "react";

let ctx = null;

function audioCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== "undefined") {
  const unlock = () => audioCtx();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("storage", (e) => {
    if (e.key === SOUND_PREF_KEY || e.key === null) {
      soundEnabledCache = null;
      for (const listener of prefListeners) listener();
    }
  });
}

// ---- Sound on/off preference (per device, shared across tabs) ----
// Persisted in localStorage; both the admin settings page and the resident
// profile sheet toggle this same flag, and every tab stays in sync through
// the storage event above.
const SOUND_PREF_KEY = "bingo-sound-enabled";
const prefListeners = new Set();
let soundEnabledCache = null;

export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  if (soundEnabledCache === null) {
    try {
      soundEnabledCache = window.localStorage.getItem(SOUND_PREF_KEY) !== "0";
    } catch {
      soundEnabledCache = true;
    }
  }
  return soundEnabledCache;
}

export function setSoundEnabled(enabled) {
  soundEnabledCache = enabled;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // storage unavailable — the in-memory preference still applies
  }
  for (const listener of prefListeners) listener();
}

function subscribePref(listener) {
  prefListeners.add(listener);
  return () => prefListeners.delete(listener);
}

export function useSoundEnabled() {
  return useSyncExternalStore(subscribePref, isSoundEnabled, () => true);
}

// One enveloped oscillator voice: fast attack, exponential decay to silence.
function tone({ freq, type = "sine", at = 0, dur = 0.5, vol = 0.18, filterFreq = 0 }) {
  if (!isSoundEnabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let head = osc;
  if (filterFreq > 0) {
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    osc.connect(filter);
    head = filter;
  }
  head.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Cute two-note chime (E6 then B6) — general notification / route started.
export function playDing() {
  tone({ freq: 1318.5, dur: 0.35, vol: 0.2 });
  tone({ freq: 1975.5, at: 0.09, dur: 0.55, vol: 0.14 });
}

// Short brass-style fanfare (C5-E5-G5 arpeggio) for "the truck is here".
// Sawtooth through a lowpass approximates a trumpet; a quiet square an octave
// below adds body.
export function playTrumpet() {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const at = i * 0.14;
    const dur = i === notes.length - 1 ? 0.6 : 0.16;
    tone({ freq, type: "sawtooth", at, dur, vol: 0.11, filterFreq: 2400 });
    tone({ freq: freq / 2, type: "square", at, dur: dur * 0.9, vol: 0.035, filterFreq: 1200 });
  });
}
