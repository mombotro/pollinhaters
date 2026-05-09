import { describe, it, expect, beforeEach } from 'vitest';
import UpgradeManager from '../src/systems/UpgradeManager.js';

describe('UpgradeManager', () => {
  let um;

  beforeEach(() => {
    um = new UpgradeManager();
  });

  it('all upgrade keys start at level 0', () => {
    const keys = [
      'BEE_SPEED', 'BEE_CAPACITY', 'BEE_STINGER_DMG', 'BEE_STINGER_RATE',
      'BEE_HP', 'BEE_ARMOR', 'HIVE_STORAGE', 'HIVE_PRODUCTION',
      'HIVE_HP', 'HIVE_WORKERS',
    ];
    keys.forEach(k => expect(um.getLevel(k)).toBe(0));
  });

  it('purchase increments level', () => {
    expect(um.purchase('BEE_SPEED')).toBe(true);
    expect(um.getLevel('BEE_SPEED')).toBe(1);
  });

  it('purchase fails when already at max level', () => {
    for (let i = 0; i < 5; i++) um.purchase('BEE_SPEED');
    expect(um.purchase('BEE_SPEED')).toBe(false);
  });

  it('getBonus returns current level', () => {
    um.purchase('BEE_ARMOR');
    um.purchase('BEE_ARMOR');
    expect(um.getBonus('BEE_ARMOR')).toBe(2);
  });

  it('getAvailableUpgrades filters out max level keys', () => {
    for (let i = 0; i < 5; i++) um.purchase('BEE_SPEED');
    const available = um.getAvailableUpgrades();
    expect(available).not.toContain('BEE_SPEED');
    expect(available).toContain('BEE_ARMOR');
  });
});
