import Phaser from 'phaser';
import { WASP_HIVE, WASP, WORLD, TOWER } from '../constants.js';
import WaspHive from '../entities/WaspHive.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';

export default class WaspHiveSystem {
  constructor({ scene, playerHiveX, playerHiveY, onDestroyed }) {
    this._scene = scene;
    this._playerHiveX = playerHiveX;
    this._playerHiveY = playerHiveY;
    this._onDestroyed = onDestroyed;
    this._totalHoneyStolen = 0;
    this._lastRegenAt = 0;

    const { x, y } = this._randomPosition(playerHiveX, playerHiveY);
    this._hive = new WaspHive(scene, x, y);

    this.hiveGroup = scene.physics.add.staticGroup();
    this.hiveGroup.add(this._hive);
  }

  get hive() { return this._hive; }

  onHoneyStolen(amount) {
    this._totalHoneyStolen += amount;
  }

  update(time) {
    if (!this._hive.active) return;
    if (time - this._lastRegenAt < WASP_HIVE.REGEN_INTERVAL) return;
    this._lastRegenAt = time;
    this._hive.heal(WaspHiveSystem.regenAmount(this._totalHoneyStolen));
  }

  spawnWave(waveSpec) {
    if (!this._hive.active) return;
    const hx = this._hive.x;
    const hy = this._hive.y;
    const mult = WaspHiveSystem.countMult(this._totalHoneyStolen);
    const hunterCount = Math.floor((waveSpec.hunterCount ?? 0) * mult);
    const raiderCount = Math.floor((waveSpec.raiderCount ?? 0) * mult);
    const pc = WaspHiveSystem.powerChance(this._totalHoneyStolen);

    for (let i = 0; i < hunterCount; i++) {
      const w = new HunterWasp(this._scene, hx, hy);
      w.setTarget(this._scene.player);
      if (Math.random() < pc) { w.hp = 2; w._speedMult = 1.25; }
      this._scene.wasps.add(w);
      if (Math.random() < 0.5) {
        const rotDir = Math.random() < 0.5 ? 1 : -1;
        const rotAmt = (Math.random() * (150 - 90) + 90) * Math.PI / 180 * rotDir;
        const wp = WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, WORLD.WIDTH, WORLD.HEIGHT, rotAmt);
        w.setFlankWaypoint(wp.x, wp.y);
      }
    }

    for (let i = 0; i < raiderCount; i++) {
      const guardPosts = this._scene._towerList
        ? this._scene._towerList.filter(t => t.towerType === 'guard' && t.active && t.hp > 0)
        : [];
      const target = guardPosts.length > 0 && Math.random() < 0.4
        ? Phaser.Utils.Array.GetRandom(guardPosts)
        : this._scene.hive;
      const w = new RaiderWasp(this._scene, hx, hy, this._scene.hive, target);
      if (Math.random() < pc) { w.hp = 2; w._speedMult = 1.25; }
      this._scene.wasps.add(w);
      if (Math.random() < 0.5) {
        const rotDir = Math.random() < 0.5 ? 1 : -1;
        const rotAmt = (Math.random() * (150 - 90) + 90) * Math.PI / 180 * rotDir;
        const wp = WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, WORLD.WIDTH, WORLD.HEIGHT, rotAmt);
        w.setFlankWaypoint(wp.x, wp.y);
      }
    }
  }

  _randomPosition(playerHiveX, playerHiveY) {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      if (Phaser.Math.Distance.Between(x, y, playerHiveX, playerHiveY) >= 800) {
        return { x, y };
      }
    }
    return { x: 400, y: 400 };
  }

  // --- Static pure helpers (testable without Phaser) ---

  static countMult(totalHoneyStolen) {
    return Math.min(3, 1 + Math.floor(totalHoneyStolen / 50) * 0.15);
  }

  static powerChance(totalHoneyStolen) {
    return Math.min(0.6, totalHoneyStolen / 200);
  }

  static regenAmount(totalHoneyStolen) {
    return WASP_HIVE.REGEN_BASE + Math.floor(totalHoneyStolen / 20) * WASP_HIVE.REGEN_PER_HONEY;
  }

  static calcFlankWaypoint(hiveX, hiveY, playerHiveX, playerHiveY, worldW, worldH, rotateBy) {
    const directAngle = Math.atan2(playerHiveY - hiveY, playerHiveX - hiveX);
    const flankAngle = directAngle + rotateBy;
    const dx = Math.cos(flankAngle);
    const dy = Math.sin(flankAngle);
    const tX = dx > 0 ? (worldW - hiveX) / dx : dx < 0 ? -hiveX / dx : Infinity;
    const tY = dy > 0 ? (worldH - hiveY) / dy : dy < 0 ? -hiveY / dy : Infinity;
    const t = Math.min(tX, tY);
    return {
      x: Math.max(0, Math.min(worldW, hiveX + t * dx)),
      y: Math.max(0, Math.min(worldH, hiveY + t * dy)),
    };
  }
}
