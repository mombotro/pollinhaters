import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const cx = 640, cy = 360;
    const barW = 400, barH = 16;

    this.add.text(cx, cy - 40, 'Loading...', {
      fontSize: '28px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(cx, cy, barW, barH, 0x333333).setOrigin(0.5);
    const bar   = this.add.rectangle(cx - barW / 2, cy, 0, barH, 0xffd700).setOrigin(0, 0.5);

    this.load.on('progress', v => bar.setSize(barW * v, barH));

    this.load.image('player-bee', 'bee.png');
    this.load.image('splash', 'splash-small.png');
    this.load.image('wasp', 'wasp.png');
    this.load.spritesheet('flower',    'flowers-sheet.png', { frameWidth: 400, frameHeight: 400 });
    this.load.spritesheet('grass-deco','grass-sheet.png',   { frameWidth: 400, frameHeight: 400 });
    this.load.spritesheet('hives',     'hives.png',         { frameWidth: 400, frameHeight: 400 });
    this.load.spritesheet('pickups',   'pickups.png',       { frameWidth: 400, frameHeight: 400 });
    this.load.spritesheet('misc',      'misc.png',          { frameWidth: 400, frameHeight: 400 });
    this.load.spritesheet('nectar-fountain', 'butterflyfountain-sheet.png', { frameWidth: 400, frameHeight: 400 });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 8, 3);
    g.generateTexture('stinger', 8, 3);

    g.clear();
    g.fillStyle(0x4488ff);
    g.fillCircle(14, 14, 12);
    g.generateTexture('guard-bee', 28, 28);

    g.clear();
    g.fillStyle(0x444444);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x888888);
    g.fillCircle(20, 20, 10);
    g.generateTexture('stinger-turret', 40, 40);

    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);

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
