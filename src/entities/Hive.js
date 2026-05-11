import Phaser from 'phaser';
import { HIVE } from '../constants.js';

export default class Hive extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hives', 1);
    this.setScale(0.2);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.hp = HIVE.HP;
    this.maxHp = HIVE.HP;
  }

  // Returns true if hive destroyed
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }
}
