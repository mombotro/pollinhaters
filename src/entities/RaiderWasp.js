import Phaser from 'phaser';
import { WASP, TOWER } from '../constants.js';

export default class RaiderWasp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, hive, target = null) {
    super(scene, x, y, 'raider-wasp');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.waspType = 'raider';
    this.hp = WASP.HP;
    this._hive = hive;
    this._target = target || hive;
    this.slowedUntil = 0;
    this.isRetreating = false;
    this.retreatTarget = null;
    this.lastHit = 0;
  }

  retreat() {
    this.isRetreating = true;
    const angle = Phaser.Math.Angle.Between(this._hive.x, this._hive.y, this.x, this.y);
    this.retreatTarget = {
      x: this.x + Math.cos(angle) * 2000,
      y: this.y + Math.sin(angle) * 2000,
    };
  }

  update(time, windVec) {
    if (this.isRetreating && this.retreatTarget) {
      const speed = time < this.slowedUntil
        ? WASP.RAIDER_SPEED * TOWER.RESIN_TRAP_SLOW
        : WASP.RAIDER_SPEED;
      this.scene.physics.moveToObject(this, this.retreatTarget, speed);
      if (this.x < -200 || this.x > 3000 || this.y < -200 || this.y > 2000) {
        this.destroy();
      }
      return;
    }

    // If assigned target (guard post) died, fall back to hive
    if (!this._target || !this._target.active) this._target = this._hive;
    if (!this._target || !this._target.active) return;

    const speed = time < this.slowedUntil
      ? WASP.RAIDER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.RAIDER_SPEED;
    this.scene.physics.moveToObject(this, this._target, speed);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
