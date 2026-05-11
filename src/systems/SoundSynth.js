let _ctx = null;
const _lastPlayed = {};

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq, type, dur, vol, endFreq, delay = 0) {
  const c = getCtx();
  const t = c.currentTime + delay;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(c.destination);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq !== undefined) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.01);
}

export default class SoundSynth {
  static play(type) {
    try {
      const now = performance.now();
      // Throttle rapid-fire sounds
      const throttle = { shoot: 130, hit: 60 };
      if (throttle[type] && now - (_lastPlayed[type] ?? 0) < throttle[type]) return;
      _lastPlayed[type] = now;

      switch (type) {
        case 'shoot':
          tone(520, 'sine', 0.05, 0.07, 240);
          break;
        case 'hit':
          tone(160, 'sine', 0.08, 0.10, 70);
          break;
        case 'pickup':
          tone(880, 'sine', 0.08, 0.11);
          tone(1320, 'sine', 0.09, 0.09, undefined, 0.06);
          break;
        case 'deposit':
          tone(660, 'sine', 0.08, 0.12);
          tone(880, 'sine', 0.08, 0.10, undefined, 0.07);
          tone(1100, 'sine', 0.09, 0.08, undefined, 0.14);
          break;
        case 'hive-hit':
          tone(90, 'sine', 0.18, 0.18, 45);
          break;
        case 'player-hit':
          tone(280, 'sine', 0.11, 0.14, 110);
          break;
      }
    } catch (e) { /* ignore audio errors */ }
  }
}
