import Phaser from 'phaser';
import { TOWER } from '../constants.js';
import Stinger from './Stinger.js';

export default class GuardBee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, post) {
    super(scene, x, y, 'guard-bee');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.hp = TOWER.GUARD_BEE_HP;
    this.maxHp = TOWER.GUARD_BEE_HP;
    this.alive = true;
    this._post = post;
    this._lastFired = 0;
  }

  update(time, wasps, stingers) {
    if (!this.alive) return;

    // Orbit the guard post
    const angle = (time / 2000) * Math.PI * 2;
    const tx = this._post.x + Math.cos(angle) * 44;
    const ty = this._post.y + Math.sin(angle) * 44;
    this.scene.physics.moveToObject(this, { x: tx, y: ty }, TOWER.GUARD_BEE_SPEED);

    // Auto-fire at nearest wasp in range
    if (time - this._lastFired < TOWER.GUARD_BEE_RATE) return;
    let nearest = null, nearestDist = TOWER.GUARD_BEE_RANGE;
    wasps.getChildren().forEach(w => {
      if (!w.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    });
    if (!nearest) return;
    const s = new Stinger(this.scene, this.x, this.y, TOWER.GUARD_BEE_DAMAGE);
    stingers.add(s);
    s.launch(nearest.x, nearest.y);
    this._lastFired = time;
  }
}
