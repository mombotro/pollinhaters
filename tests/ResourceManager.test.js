import { describe, it, expect, beforeEach } from 'vitest';
import ResourceManager from '../src/systems/ResourceManager.js';

describe('ResourceManager', () => {
  let rm;

  beforeEach(() => {
    rm = new ResourceManager({ honeyStorage: 100, sapConversionRate: 1 });
  });

  it('starts with zero sap carried and zero honey', () => {
    expect(rm.getSapCarried('player')).toBe(0);
    expect(rm.getHoney()).toBe(0);
  });

  it('adds sap up to capacity', () => {
    rm.addSap('player', 5, 10);
    expect(rm.getSapCarried('player')).toBe(5);
  });

  it('caps sap at capacity', () => {
    rm.addSap('player', 15, 10);
    expect(rm.getSapCarried('player')).toBe(10);
  });

  it('deposit clears carried sap into pending', () => {
    rm.addSap('player', 8, 10);
    rm.depositSap('player');
    expect(rm.getSapCarried('player')).toBe(0);
    expect(rm.getPendingSap()).toBe(8);
  });

  it('convertSap turns pending into honey', () => {
    rm.addSap('player', 3, 10);
    rm.depositSap('player');
    rm.convertSap(3);
    expect(rm.getHoney()).toBe(3);
    expect(rm.getPendingSap()).toBe(0);
  });

  it('caps honey at storage limit', () => {
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(200);
    expect(rm.getHoney()).toBe(10);
  });

  it('stealSap returns amount stolen and reduces carried', () => {
    rm.addSap('player', 5, 10);
    const stolen = rm.stealSap('player', 3);
    expect(stolen).toBe(3);
    expect(rm.getSapCarried('player')).toBe(2);
  });

  it('stealSap only takes what is available', () => {
    rm.addSap('player', 2, 10);
    const stolen = rm.stealSap('player', 10);
    expect(stolen).toBe(2);
    expect(rm.getSapCarried('player')).toBe(0);
  });

  it('stealHoney reduces honey', () => {
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    const stolen = rm.stealHoney(4);
    expect(stolen).toBe(4);
    expect(rm.getHoney()).toBe(6);
  });

  it('spendHoney succeeds if enough available', () => {
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    expect(rm.spendHoney(5)).toBe(true);
    expect(rm.getHoney()).toBe(5);
  });

  it('spendHoney fails if insufficient', () => {
    expect(rm.spendHoney(5)).toBe(false);
    expect(rm.getHoney()).toBe(0);
  });

  it('setHoneyStorage raises cap and allows more honey', () => {
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    rm.setHoneyStorage(200);
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    expect(rm.getHoney()).toBe(20);
  });

  it('addPendingSap increments pending sap directly', () => {
    rm.addPendingSap(7);
    expect(rm.getPendingSap()).toBe(7);
    rm.convertSap(7);
    expect(rm.getHoney()).toBe(7);
  });
});
