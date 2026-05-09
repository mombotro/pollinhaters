import Phaser from 'phaser';
import { BUTTERFLY, FLOWER } from '../constants.js';

export default class Butterfly extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'butterfly');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._angle    = Math.random() * Math.PI * 2;
    this._nextTurn = 0;
  }

  update(time, delta, player, pollination, flowers) {
    if (time > this._nextTurn) {
      this._angle    = Math.random() * Math.PI * 2;
      this._nextTurn = time + BUTTERFLY.DIRECTION_CHANGE + Phaser.Math.Between(-500, 500);
    }

    if (player.alive) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < BUTTERFLY.FLEE_RADIUS) {
        this._angle    = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this._nextTurn = time + 1200;
      } else {
        this._seekAromatic(flowers);
      }
    } else {
      this._seekAromatic(flowers);
    }

    this.setVelocity(
      Math.cos(this._angle) * BUTTERFLY.SPEED,
      Math.sin(this._angle) * BUTTERFLY.SPEED,
    );

    // Pollinate + boost nearby flowers in one pass
    flowers.getChildren().forEach(flower => {
      if (!flower.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, flower.x, flower.y);
      if (d < BUTTERFLY.POLLINATE_RADIUS && !flower.pollenCollected && flower.lifecycle !== 'young') {
        flower.collectPollen();
        pollination.pollinate({ x: flower.x, y: flower.y }, time);
      }
      if (d < BUTTERFLY.BOOST_RADIUS) {
        flower.receiveButterflyBoost(delta);
      }
    });
  }

  _seekAromatic(flowers) {
    let nearest = null, nearestDist = FLOWER.AROMATIC_RADIUS;
    flowers.getChildren().forEach(f => {
      if (!f.active || f.flowerType !== 'AROMATIC' || f.lifecycle !== 'mature') return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    if (nearest) {
      this._angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
    }
  }
}
