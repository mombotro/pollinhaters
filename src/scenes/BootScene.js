import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // player-bee: yellow circle
    g.fillStyle(0xffd700);
    g.fillCircle(16, 16, 14);
    g.generateTexture('player-bee', 32, 32);

    // hunter-wasp: orange with black stripes
    g.clear();
    g.fillStyle(0xff6600);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0x000000);
    g.fillRect(0, 8, 28, 4);
    g.fillRect(0, 18, 28, 4);
    g.generateTexture('hunter-wasp', 28, 28);

    // raider-wasp: dark orange with black stripes
    g.clear();
    g.fillStyle(0xcc4400);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0x000000);
    g.fillRect(0, 8, 28, 4);
    g.fillRect(0, 18, 28, 4);
    g.generateTexture('raider-wasp', 28, 28);

    // flower: green circle with pink center
    g.clear();
    g.fillStyle(0x00aa00);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0xff99cc);
    g.fillCircle(20, 20, 8);
    g.generateTexture('flower', 40, 40);

    // hive: amber square with inner square
    g.clear();
    g.fillStyle(0xcc8800);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0xffaa00);
    g.fillRect(8, 8, 48, 48);
    g.generateTexture('hive', 64, 64);

    // stinger: small white rectangle
    g.clear();
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 8, 3);
    g.generateTexture('stinger', 8, 3);

    // worker-bee: smaller yellow circle
    g.clear();
    g.fillStyle(0xffcc00);
    g.fillCircle(12, 12, 10);
    g.generateTexture('worker-bee', 24, 24);

    // guard-bee: blue circle
    g.clear();
    g.fillStyle(0x4488ff);
    g.fillCircle(14, 14, 12);
    g.generateTexture('guard-bee', 28, 28);

    // stinger-turret: dark grey hexagon approximated as circle with ring
    g.clear();
    g.fillStyle(0x444444);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x888888);
    g.fillCircle(20, 20, 10);
    g.generateTexture('stinger-turret', 40, 40);

    // resin-trap: amber translucent blob
    g.clear();
    g.fillStyle(0xcc8800, 0.7);
    g.fillCircle(24, 24, 22);
    g.generateTexture('resin-trap', 48, 48);

    // guard-post: brown square with inner diamond
    g.clear();
    g.fillStyle(0x886633);
    g.fillRect(0, 0, 40, 40);
    g.fillStyle(0xffcc00);
    g.fillRect(10, 10, 20, 20);
    g.generateTexture('guard-post', 40, 40);

    g.clear();
    g.fillStyle(0x00ffff);
    g.fillCircle(6, 6, 4);
    g.generateTexture('xp-gem', 12, 12);

    // butterfly: small cyan wing-diamond shape
    g.clear();
    g.fillStyle(0x00dddd);
    g.fillTriangle(10, 0, 0, 16, 20, 16);
    g.fillStyle(0x00aaaa);
    g.fillTriangle(10, 20, 0, 4, 20, 4);
    g.generateTexture('butterfly', 20, 20);

    // spider: small dark grey circle with leg hints
    g.clear();
    g.fillStyle(0x222222);
    g.fillCircle(10, 10, 8);
    g.lineStyle(1, 0x444444, 1);
    g.strokeRect(2, 4, 16, 12);
    g.generateTexture('spider', 20, 20);

    // web: concentric white rings (semi-transparent)
    g.clear();
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokeCircle(24, 24, 22);
    g.strokeCircle(24, 24, 14);
    g.strokeCircle(24, 24, 6);
    g.lineStyle(1, 0xffffff, 0.4);
    g.lineBetween(2, 24, 46, 24);
    g.lineBetween(24, 2, 24, 46);
    g.lineBetween(7, 7, 41, 41);
    g.lineBetween(41, 7, 7, 41);
    g.generateTexture('web', 48, 48);

    g.destroy();
    this.scene.start('MenuScene');
  }
}
