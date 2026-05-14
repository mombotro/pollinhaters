import Phaser from 'phaser';
import { WASP_HIVE, WASP, WORLD, TOWER } from '../constants.js';
import WaspHive from '../entities/WaspHive.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';
import ArcherWasp from '../entities/ArcherWasp.js';

export default class WaspHiveSystem {
  constructor({ scene, playerHiveX, playerHiveY, onDestroyed, extraHives = 0 }) {
    this._scene = scene;
    this._playerHiveX = playerHiveX;
    this._playerHiveY = playerHiveY;
    this._onDestroyed = onDestroyed;
    this._totalHoneyStolen = 0;
    this._lastRegenAt = 0;
    this._lastDefenseAt = -99999;

    this._hives = [];
    const count = 1 + extraHives;
    for (let i = 0; i < count; i++) {
      const { x, y } = this._randomPosition(playerHiveX, playerHiveY);
      const hive = new WaspHive(scene, x, y);
      hive.onDamaged = () => this.spawnOnDamage(hive);
      this._hives.push(hive);
    }
  }

  // Primary hive (first still alive, or fallback to first)
  get hive() { return this._hives.find(h => h.hp > 0) ?? this._hives[0]; }
  get hives() { return this._hives; }
  get honeyStolen() { return this._totalHoneyStolen; }

  onHoneyStolen(amount) {
    this._totalHoneyStolen += amount;
  }

  onPoisonDelivered(amount) {
    this._totalHoneyStolen = Math.max(0, this._totalHoneyStolen - amount);
  }

  onHiveAttacked(time, hive) {
    const h = hive ?? this._hives[0];
    if (!h || h.hp <= 0) return;
    if (time - this._lastDefenseAt < 5000) return;
    this._lastDefenseAt = time;
    const count = 3 + Math.floor(WaspHiveSystem.countMult(this._totalHoneyStolen));
    for (let i = 0; i < count; i++) {
      const jx = h.x + (Math.random() - 0.5) * 60;
      const jy = h.y + (Math.random() - 0.5) * 60;
      const w = new HunterWasp(this._scene, jx, jy);
      w.setTarget(this._scene.player);
      if (Math.random() < WaspHiveSystem.powerChance(this._totalHoneyStolen)) {
        w.hp = 2; w._speedMult = 1.25;
      }
      this._scene.wasps.add(w);
    }
  }

  onHiveDestroyed() {
    if (this._hives.every(h => h.hp <= 0)) {
      this._onDestroyed();
    }
  }

  spawnOnDamage(hive) {
    if (!hive || hive.hp <= 0) return;
    const jx = hive.x + (Math.random() - 0.5) * 60;
    const jy = hive.y + (Math.random() - 0.5) * 60;
    const w = new HunterWasp(this._scene, jx, jy);
    w.setTarget(this._scene.player);
    if (Math.random() < WaspHiveSystem.powerChance(this._totalHoneyStolen)) {
      w.hp = 2; w._speedMult = 1.25;
    }
    this._scene.wasps.add(w);
  }

  update(time) {
    this._hives.forEach(h => {
      if (h.hp <= 0) return;
      if (time - this._lastRegenAt < WASP_HIVE.REGEN_INTERVAL) return;
      h.heal(WaspHiveSystem.regenAmount(this._totalHoneyStolen));
    });
    if (time - this._lastRegenAt >= WASP_HIVE.REGEN_INTERVAL) {
      this._lastRegenAt = time;
    }
  }

  spawnWave(waveSpec) {
    const activeHives = this._hives.filter(h => h.hp > 0);
    if (!activeHives.length) return;

    activeHives.forEach(h => {
      const hx = h.x, hy = h.y;
      const mult = WaspHiveSystem.countMult(this._totalHoneyStolen);
      const hunterCount  = Math.floor((waveSpec.hunterCount  ?? 0) * mult);
      const raiderCount  = Math.floor((waveSpec.raiderCount  ?? 0) * mult);
      const archerCount  = Math.floor((waveSpec.archerCount  ?? 0) * mult);
      const pc = WaspHiveSystem.powerChance(this._totalHoneyStolen);

      const jitter = () => ({ x: hx + (Math.random() - 0.5) * 60, y: hy + (Math.random() - 0.5) * 60 });

      for (let i = 0; i < hunterCount; i++) {
        const { x: wx, y: wy } = jitter();
        const w = new HunterWasp(this._scene, wx, wy);
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

      for (let i = 0; i < archerCount; i++) {
        const { x: wx, y: wy } = jitter();
        const w = new ArcherWasp(this._scene, wx, wy);
        w.setTarget(this._scene.player);
        this._scene.wasps.add(w);
      }

      for (let i = 0; i < raiderCount; i++) {
        const { x: wx, y: wy } = jitter();
        const priorityTargets = this._scene._towerList
          ? this._scene._towerList.filter(t =>
              (t.towerType === 'guard' && t.active && t.hp > 0) ||
              (t.towerType === 'nectar-fountain' && t.hp > 0))
          : [];
        const target = priorityTargets.length > 0 && Math.random() < 0.45
          ? Phaser.Utils.Array.GetRandom(priorityTargets)
          : this._scene.hive;
        const w = new RaiderWasp(this._scene, wx, wy, this._scene.hive, target, h);
        if (Math.random() < pc) { w.hp = 2; w._speedMult = 1.25; }
        this._scene.wasps.add(w);
        if (Math.random() < 0.5) {
          const rotDir = Math.random() < 0.5 ? 1 : -1;
          const rotAmt = (Math.random() * (150 - 90) + 90) * Math.PI / 180 * rotDir;
          const wp = WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, WORLD.WIDTH, WORLD.HEIGHT, rotAmt);
          w.setFlankWaypoint(wp.x, wp.y);
        }
      }
    });
  }

  _randomPosition(playerHiveX, playerHiveY) {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      const farFromPlayer = Phaser.Math.Distance.Between(x, y, playerHiveX, playerHiveY) >= 800;
      const farFromOthers = this._hives.every(h => Phaser.Math.Distance.Between(x, y, h.x, h.y) >= 600);
      if (farFromPlayer && farFromOthers) return { x, y };
    }
    return { x: 400, y: 400 };
  }

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
