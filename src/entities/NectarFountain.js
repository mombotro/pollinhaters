import Phaser from 'phaser';
import { NECTAR_FOUNTAIN } from '../constants.js';

export default class NectarFountain extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'nectar-fountain', 0);
    this.setScale(0.25);
    scene.add.existing(this);
    this.towerType = 'nectar-fountain';
    this.hp = NECTAR_FOUNTAIN.HP;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.setFrame(1);
      return true;
    }
    // Flash white
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.scene) this.clearTint(); });
    return false;
  }
}
