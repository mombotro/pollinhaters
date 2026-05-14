import Phaser from 'phaser';
import { BUTTERFLY, WORLD } from '../constants.js';

export default class Butterfly extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'misc', 5);
    this.setScale(0.05);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._angle    = Math.random() * Math.PI * 2;
    this._nextTurn = 0;
    this._fountain = null;
  }

  update(time, delta, player, pollination, flowers) {
    // Pick new wander direction
    if (time > this._nextTurn) {
      if (this._fountain && this._fountain.hp > 0) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this._fountain.x, this._fountain.y);
        if (dist > BUTTERFLY.FOUNTAIN_WANDER_RADIUS) {
          this._angle = Phaser.Math.Angle.Between(this.x, this.y, this._fountain.x, this._fountain.y);
        } else {
          this._angle = Math.random() * Math.PI * 2;
        }
      } else {
        this._fountain = null;
        this._angle = Math.random() * Math.PI * 2;
      }
      this._nextTurn = time + BUTTERFLY.DIRECTION_CHANGE + Phaser.Math.Between(-1500, 1500);
    }

    // Flee player
    if (player.alive) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < BUTTERFLY.FLEE_RADIUS) {
        this._angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this._nextTurn = time + 1200;
      }
    }

    // Flee wasps (only when no fountain)
    if (!this._fountain && this.scene?.wasps) {
      this.scene.wasps.getChildren().forEach(w => {
        if (!w.active) return;
        const d = Phaser.Math.Distance.Between(this.x, this.y, w.x, w.y);
        if (d < BUTTERFLY.FLEE_WASP_RADIUS) {
          this._angle = Phaser.Math.Angle.Between(w.x, w.y, this.x, this.y);
          this._nextTurn = time + 1500;
        }
      });
    }

    this.setVelocity(
      Math.cos(this._angle) * BUTTERFLY.SPEED,
      Math.sin(this._angle) * BUTTERFLY.SPEED,
    );

    // Pollinate + boost nearby flowers
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
}
