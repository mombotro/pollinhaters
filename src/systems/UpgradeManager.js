import { UPGRADE } from '../constants.js';

const KEYS = [
  'BEE_SPEED', 'BEE_CAPACITY', 'BEE_STINGER_DMG', 'BEE_STINGER_RATE', 'BEE_STINGER_DIST', 'BEE_STINGER_SPEED',
  'BEE_HP', 'BEE_ARMOR', 'HIVE_STORAGE', 'HIVE_PRODUCTION',
  'HIVE_HP', 'HIVE_WORKERS',
];

export default class UpgradeManager {
  constructor() {
    this._levels = {};
    KEYS.forEach(k => { this._levels[k] = 0; });
  }

  getLevel(key) { return this._levels[key] ?? 0; }

  // Returns true if successfully upgraded
  purchase(key) {
    if (this.getLevel(key) >= UPGRADE.MAX_LEVEL) return false;
    this._levels[key]++;
    return true;
  }

  getBonus(key) { return this._levels[key]; }

  // Returns keys that are not max level
  getAvailableUpgrades() {
    return KEYS.filter(key => this.getLevel(key) < UPGRADE.MAX_LEVEL);
  }
}
