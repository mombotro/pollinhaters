import { WASP_HIVE } from '../constants.js';
import WaspHive from '../entities/WaspHive.js';

export default class WaspHiveSystem {
  constructor({ scene, playerHiveX, playerHiveY, onDestroyed }) {
    this._scene = scene;
    this._playerHiveX = playerHiveX;
    this._playerHiveY = playerHiveY;
    this._onDestroyed = onDestroyed;
    this._totalHoneyStolen = 0;
    this._lastRegenTime = 0;

    const pos = this._randomPosition();
    this._hive = new WaspHive(scene, pos.x, pos.y);

    this.hiveGroup = scene.physics.add.staticGroup();
    this.hiveGroup.add(this._hive);
  }

  get hive() { return this._hive; }

  update(time) {
    if (!this._hive || this._hive.hp <= 0) return;
    if (time - this._lastRegenTime >= WASP_HIVE.REGEN_INTERVAL) {
      this._lastRegenTime = time;
      const amount = WaspHiveSystem.regenAmount(this._totalHoneyStolen);
      this._hive.heal(amount);
    }
  }

  onHoneyStolen(amount) {
    this._totalHoneyStolen += amount;
  }

  spawnWave(waveSpec) {
    const honey = this._totalHoneyStolen;
    const mult = WaspHiveSystem.countMult(honey);
    const chance = WaspHiveSystem.powerChance(honey);
    const hx = this._hive.x;
    const hy = this._hive.y;
    const mapW = this._scene.physics.world.bounds.width;
    const mapH = this._scene.physics.world.bounds.height;

    const scaledCount = Math.round((waveSpec.count ?? 1) * mult);
    const spawned = [];

    for (let i = 0; i < scaledCount; i++) {
      const powered = Math.random() < chance;
      const flank = i < Math.floor(scaledCount * 0.5);
      const angle = flank
        ? WaspHiveSystem._flankAngle(hx, hy, this._playerHiveX, this._playerHiveY)
        : null;

      spawned.push({
        x: hx,
        y: hy,
        type: waveSpec.type ?? 'hunter',
        powered,
        flankWaypoint: flank && angle !== null
          ? WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, angle, mapW, mapH)
          : null,
      });
    }
    return spawned;
  }

  _randomPosition() {
    const bounds = this._scene.physics.world.bounds;
    const margin = 200;
    const minDist = 800;
    let x, y, dist;
    do {
      x = margin + Math.random() * (bounds.width - margin * 2);
      y = margin + Math.random() * (bounds.height - margin * 2);
      dist = Math.hypot(x - this._playerHiveX, y - this._playerHiveY);
    } while (dist < minDist);
    return { x, y };
  }

  // --- Static pure helpers (testable without Phaser) ---

  static countMult(honey) {
    return Math.min(3, 1 + Math.floor(honey / 50) * 0.15);
  }

  static powerChance(honey) {
    return Math.min(0.6, honey / 200);
  }

  static regenAmount(honey) {
    return WASP_HIVE.REGEN_BASE + Math.floor(honey / 20) * WASP_HIVE.REGEN_PER_HONEY;
  }

  static _flankAngle(hx, hy, phx, phy) {
    const base = Math.atan2(phy - hy, phx - hx);
    const deg90 = Math.PI / 2;
    const deg150 = Math.PI * 5 / 6;
    const offset = deg90 + Math.random() * (deg150 - deg90);
    return base + (Math.random() < 0.5 ? offset : -offset);
  }

  static calcFlankWaypoint(hx, hy, phx, phy, angle, mapW, mapH) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Ray-cast from hive in flank direction to map boundary
    let t = Infinity;
    if (cos > 0)  t = Math.min(t, (mapW - hx) / cos);
    if (cos < 0)  t = Math.min(t, (0    - hx) / cos);
    if (sin > 0)  t = Math.min(t, (mapH - hy) / sin);
    if (sin < 0)  t = Math.min(t, (0    - hy) / sin);
    return { x: hx + cos * t, y: hy + sin * t };
  }
}
