import Phaser from 'phaser';
import { TOWER } from '../constants.js';
import Stinger from '../entities/Stinger.js';

export default class StingerTurret extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'stinger-turret');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.towerType = 'stinger';
    this._lastFired = 0;
  }

  update(time, wasps, stingers) {
    if (time - this._lastFired < TOWER.STINGER_TURRET_RATE) return;
    let nearest = null, nearestDist = TOWER.STINGER_TURRET_RANGE;
    wasps.getChildren().forEach(w => {
      if (!w.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    });
    if (!nearest) return;
    const s = new Stinger(this.scene, this.x, this.y, TOWER.STINGER_TURRET_DAMAGE);
    stingers.add(s);
    s.launch(nearest.x, nearest.y);
    this._lastFired = time;
  }
}
