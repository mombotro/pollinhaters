import { describe, it, expect } from 'vitest';
import WindSystem from '../src/systems/WindSystem.js';
import { WIND } from '../src/constants.js';

describe('WindSystem', () => {
  it('starts with zero vector', () => {
    const wind = new WindSystem();
    const { x, y } = wind.getVector();
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('stays at zero before first shift interval', () => {
    const wind = new WindSystem();
    wind.update(WIND.SHIFT_INTERVAL - 1);
    const { x, y } = wind.getVector();
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('getVector returns numeric x/y after running', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 60000; t += 100) wind.update(t);
    const { x, y } = wind.getVector();
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
    expect(isNaN(x)).toBe(false);
    expect(isNaN(y)).toBe(false);
  });

  it('vector magnitude never exceeds MAX_STRENGTH', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 120000; t += 100) wind.update(t);
    const { x, y } = wind.getVector();
    const magnitude = Math.sqrt(x * x + y * y);
    expect(magnitude).toBeLessThanOrEqual(WIND.MAX_STRENGTH + 0.001);
  });

  it('getCurrentStrength returns the internal strength', () => {
    const wind = new WindSystem();
    for (let t = 0; t <= 60000; t += 100) wind.update(t);
    const strength = wind.getCurrentStrength();
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(WIND.MAX_STRENGTH + 0.001);
  });
});
