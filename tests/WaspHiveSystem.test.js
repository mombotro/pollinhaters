import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/entities/WaspHive.js', () => ({ default: class WaspHive {} }));

import WaspHiveSystem from '../src/systems/WaspHiveSystem.js';

describe('WaspHiveSystem.countMult', () => {
  it('returns 1 at 0 honey', () => {
    expect(WaspHiveSystem.countMult(0)).toBe(1);
  });
  it('returns 1.15 at 50 honey', () => {
    expect(WaspHiveSystem.countMult(50)).toBeCloseTo(1.15);
  });
  it('returns 1.3 at 100 honey', () => {
    expect(WaspHiveSystem.countMult(100)).toBeCloseTo(1.3);
  });
  it('caps at 3 at 700+ honey', () => {
    expect(WaspHiveSystem.countMult(700)).toBe(3);
    expect(WaspHiveSystem.countMult(1000)).toBe(3);
  });
});

describe('WaspHiveSystem.powerChance', () => {
  it('returns 0 at 0 honey', () => {
    expect(WaspHiveSystem.powerChance(0)).toBe(0);
  });
  it('scales linearly below cap', () => {
    expect(WaspHiveSystem.powerChance(100)).toBeCloseTo(0.5);
  });
  it('caps at 0.6 at 200 honey', () => {
    expect(WaspHiveSystem.powerChance(200)).toBeCloseTo(0.6);
  });
  it('stays capped above 200', () => {
    expect(WaspHiveSystem.powerChance(500)).toBeCloseTo(0.6);
  });
});

describe('WaspHiveSystem.regenAmount', () => {
  it('returns REGEN_BASE at 0 honey', () => {
    expect(WaspHiveSystem.regenAmount(0)).toBeCloseTo(0.5);
  });
  it('adds 0.1 per 20 honey stolen', () => {
    // 100 honey: floor(100/20) * 0.1 = 5 * 0.1 = 0.5 extra → 1.0 total
    expect(WaspHiveSystem.regenAmount(100)).toBeCloseTo(1.0);
  });
});

describe('WaspHiveSystem.calcFlankWaypoint', () => {
  it('returns a point on the map boundary', () => {
    const mapW = 2000, mapH = 2000;
    const result = WaspHiveSystem.calcFlankWaypoint(1000, 1000, 1000, 1000, 0.5, mapW, mapH);
    const onEdge = result.x <= 0 || result.x >= mapW || result.y <= 0 || result.y >= mapH;
    expect(onEdge).toBe(true);
  });
});
