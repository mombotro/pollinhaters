import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = 640, cy = 360;

    this.add.text(cx, cy - 100, 'PollinHaters', {
      fontSize: '72px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, 'Protect the hive. Survive 10 minutes.', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const btnStart = this.add.text(cx, cy + 60, '[ START ]', {
      fontSize: '36px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnStart.on('pointerover', () => btnStart.setColor('#ffffff'));
    btnStart.on('pointerout',  () => btnStart.setColor('#ffd700'));
    btnStart.on('pointerdown', () => this.scene.start('GameScene'));

    const btnUpgrades = this.add.text(cx, cy + 120, '[ UPGRADES ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnUpgrades.on('pointerover', () => btnUpgrades.setColor('#ffffff'));
    btnUpgrades.on('pointerout',  () => btnUpgrades.setColor('#ffd700'));
    btnUpgrades.on('pointerdown', () => this.scene.start('MetaUpgradeScene'));
  }
}
