import Phaser from 'phaser';
import { BEE } from '../constants.js';

export default class Stinger extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, damage = BEE.STINGER_DAMAGE, maxDist = BEE.STINGER_RANGE, speed = BEE.STINGER_SPEED) {
    super(scene, x, y, 'stinger');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this._maxDist = maxDist || BEE.STINGER_RANGE;
    this._speed = speed || BEE.STINGER_SPEED;
  }

  // Called after group.add() so world.enable() has run and body is stable
  launch(targetX, targetY) {
    const angleRad = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setRotation(angleRad);
    this.body.setVelocity(
      Math.cos(angleRad) * this._speed,
      Math.sin(angleRad) * this._speed
    );
    const lifetime = (this._maxDist / this._speed) * 1000;
    this.scene.time.delayedCall(lifetime, () => { if (this.active) this.destroy(); });
  }
}
