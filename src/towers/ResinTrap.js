import Phaser from 'phaser';
import { TOWER } from '../constants.js';

export default class ResinTrap extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'resin-trap');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.towerType = 'resin';
  }

  update(time, wasps) {
    wasps.getChildren().forEach(wasp => {
      if (!wasp.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, wasp.x, wasp.y);
      if (dist <= TOWER.RESIN_TRAP_RADIUS) {
        wasp.slowedUntil = time + TOWER.RESIN_TRAP_DURATION;
      }
    });
  }
}
