import Phaser from 'phaser';
import { WASP, TOWER } from '../constants.js';

export default class HunterWasp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hunter-wasp');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.waspType = 'hunter';
    this.hp = WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
  }

  setTarget(target) { this._target = target; }

  update(time, windVec) {
    if (!this._target || !this._target.active || !this._target.alive) {
      // Counter wind so wasp doesn't drift off screen while player is respawning
      if (windVec) this.body.setVelocity(-windVec.x, -windVec.y);
      return;
    }
    const speed = time < this.slowedUntil
      ? WASP.HUNTER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.HUNTER_SPEED;
    this.scene.physics.moveToObject(this, this._target, speed);
  }

  // Returns true if destroyed
  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
