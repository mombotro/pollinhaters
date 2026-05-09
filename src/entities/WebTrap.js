import Phaser from 'phaser';
import { WEB } from '../constants.js';

export default class WebTrap extends Phaser.GameObjects.Line {
  constructor(scene, f1, f2) {
    super(scene, 0, 0, f1.x, f1.y, f2.x, f2.y, 0xffffff, 0.7);
    this.setOrigin(0, 0);
    this.setLineWidth(2);
    scene.add.existing(this);
    this._contactStart = null;
    this._f1 = f1;
    this._f2 = f2;
    this.x1 = f1.x;
    this.y1 = f1.y;
    this.x2 = f2.x;
    this.y2 = f2.y;
  }

  // entities: array of active Phaser.Physics.Arcade.Sprite
  // Returns true when destroyed.
  update(time, entities) {
    if (!this.active) return true;

    if (!this._f1.active || !this._f2.active) {
      this.destroy();
      return true;
    }

    let anyContact = false;
    entities.forEach(entity => {
      if (!entity.active) return;

      const l2 = Phaser.Math.Distance.Squared(this.x1, this.y1, this.x2, this.y2);
      let t = 0;
      if (l2 > 0) {
        t = ((entity.x - this.x1) * (this.x2 - this.x1) + (entity.y - this.y1) * (this.y2 - this.y1)) / l2;
        t = Math.max(0, Math.min(1, t));
      }
      const projX = this.x1 + t * (this.x2 - this.x1);
      const projY = this.y1 + t * (this.y2 - this.y1);
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, projX, projY);

      if (dist <= WEB.RADIUS) {
        anyContact = true;
        const ease = this._contactStart ? Math.min(1, (time - this._contactStart) / WEB.BREAK_TIME) : 0;
        const slowFactor = 0.2 + (0.8 * ease);
        entity.body.velocity.x *= slowFactor;
        entity.body.velocity.y *= slowFactor;
      }
    });

    if (anyContact) {
      if (this._contactStart === null) this._contactStart = time;
      else if (time - this._contactStart >= WEB.BREAK_TIME) {
        this.destroy();
        return true;
      }
    } else {
      this._contactStart = null;
    }
    return false;
  }
}
