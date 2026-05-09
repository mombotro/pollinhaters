import Phaser from 'phaser';
import { SPIDER } from '../constants.js';

export default class Spider extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spider');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._target = null;
    this._dwelling = false;
    this._dwellStart = 0;
  }

  // flowers: Phaser staticGroup
  // onPlaceWeb: callback (x, y) => void
  update(time, delta, flowers, onPlaceWeb) {
    if (!this._target || !this._target.active) {
      this._findTarget(flowers);
    }
    if (!this._target) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y);
    if (dist > 40) {
      this._dwelling = false;
      this.scene.physics.moveToObject(this, this._target, SPIDER.SPEED);
    } else {
      this.setVelocity(0, 0);
      if (!this._dwelling) {
        this._dwelling = true;
        this._dwellStart = time;
      } else if (time - this._dwellStart >= SPIDER.WEB_PLACE_TIME) {
        let f2 = null;
        let f2Dist = Infinity;
        flowers.getChildren().forEach(f => {
          if (f === this._target || !f.active) return;
          const d = Phaser.Math.Distance.Between(this._target.x, this._target.y, f.x, f.y);
          if (d < 180 && d < f2Dist) { f2 = f; f2Dist = d; }
        });
        
        if (f2) {
          onPlaceWeb(this._target, f2);
        }
        // no second flower in range — skip placement, find a new target
        this._dwelling = false;
        this._target = null;
      }
    }
  }

  _findTarget(flowers) {
    let nearest = null, nearestDist = Infinity;
    flowers.getChildren().forEach(f => {
      if (!f.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    this._target = nearest;
  }
}
