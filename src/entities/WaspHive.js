import Phaser from 'phaser';
import { WASP_HIVE } from '../constants.js';

export default class WaspHive extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hives', 0);
    this.setScale(0.2);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.hp = WASP_HIVE.HP;
    this.maxHp = WASP_HIVE.HP;

    this._bar = scene.add.graphics();
    this._drawBar();
  }

  _drawBar() {
    const ratio = this.hp / this.maxHp;
    if (ratio === this._barRatio) return;
    this._barRatio = ratio;
    const W = 60, H = 7;
    const x = this.x - W / 2;
    const y = this.y - 42;
    this._bar.clear();
    this._bar.fillStyle(0x222222);
    this._bar.fillRect(x, y, W, H);
    this._bar.fillStyle(0xff4400);
    this._bar.fillRect(x, y, W * ratio, H);
  }

  takeDamage(amount) {
    if (this.hp <= 0) return true;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    this._drawBar();
    if (this.onDamaged) this.onDamaged();
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._drawBar();
  }

  destroy(fromScene) {
    this._bar.destroy();
    super.destroy(fromScene);
  }
}
