import Phaser from 'phaser';

export default class XpGem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value) {
    super(scene, x, y, 'xp-gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Spread them out slightly if multiple drop
    const vx = Phaser.Math.Between(-30, 30);
    const vy = Phaser.Math.Between(-30, 30);
    this.setVelocity(vx, vy);
    this.setDrag(100, 100);

    this.xpValue = value;
  }
}
