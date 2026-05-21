import Phaser from 'phaser';

const LABELS = {
  BEE_SPEED:        'Bee Speed',
  BEE_CAPACITY:     'Bee Capacity',
  BEE_STINGER_DMG:  'Stinger Damage',
  BEE_STINGER_RATE: 'Attack Speed',
  BEE_STINGER_DIST: 'Stinger Range',
  BEE_STINGER_SPEED: 'Stinger Speed',
  BEE_HP:           'Bee Max HP',
  BEE_ARMOR:        'Bee Armor',
  HIVE_STORAGE:     'Hive Storage',
  HIVE_PRODUCTION:  'Honey Rate',
  HIVE_HP:          'Hive Max HP',
  HIVE_WORKERS:     'Free Worker',
  SOLDIER_DMG:      'Soldier Damage',
  SOLDIER_RATE:     'Soldier Attack Speed',
};

export default class LevelUpMenu {
  constructor(scene, onSelect) {
    this._scene = scene;
    this._onSelect = onSelect;

    const s = { fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 3, fontFamily: 'monospace' };
    const hs = { ...s, fontSize: '24px', color: '#ffd700' };

    this._bg = scene.add.rectangle(640, 360, 600, 400, 0x000000, 0.9)
      .setScrollFactor(0).setDepth(300);

    this._title = scene.add.text(640, 180, 'LEVEL UP!', hs)
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(301);

    this._cards = [];
    for (let i = 0; i < 3; i++) {
      const cardBg = scene.add.rectangle(640, 240 + i * 60, 400, 50, 0x333333, 1)
        .setScrollFactor(0).setDepth(301).setInteractive();
      const text = scene.add.text(640, 240 + i * 60, '', s)
        .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(302);
      
      cardBg.on('pointerover', () => cardBg.setFillStyle(0x555555));
      cardBg.on('pointerout', () => cardBg.setFillStyle(0x333333));
      cardBg.on('pointerdown', () => {
        if (this._visible && this._options[i]) {
          this._onSelect(this._options[i]);
          this.hide();
        }
      });
      
      this._cards.push({ bg: cardBg, text });
    }

    this.hide();
  }

  show(upgradesManager) {
    this._visible = true;
    this._bg.setVisible(true);
    this._title.setVisible(true);

    const available = upgradesManager.getAvailableUpgrades();
    Phaser.Utils.Array.Shuffle(available);
    this._options = available.slice(0, 3);

    this._cards.forEach((card, i) => {
      if (i < this._options.length) {
        const key = this._options[i];
        const currentLevel = upgradesManager.getLevel(key);
        card.text.setText(`${LABELS[key]} (Lv ${currentLevel + 1})`);
        card.bg.setVisible(true);
        card.text.setVisible(true);
      } else {
        card.bg.setVisible(false);
        card.text.setVisible(false);
      }
    });

    this._gpIdx    = 0;
    this._gpAWas   = false;
    this._gpDirWas = false;
    this._gpRefresh();
  }

  _gpRefresh() {
    this._cards.forEach((card, i) => {
      if (i < (this._options?.length ?? 0)) {
        card.bg.setFillStyle(i === this._gpIdx ? 0x886600 : 0x333333);
      }
    });
  }

  kbUpdate(upJD, downJD, enterJD) {
    const n = this._options?.length ?? 0;
    if (!n) return;
    if (upJD || downJD) {
      const dy = upJD ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + n) % n;
      this._gpRefresh();
    }
    if (enterJD && this._options[this._gpIdx]) {
      this._onSelect(this._options[this._gpIdx]);
      this.hide();
    }
  }

  gpUpdate(pad) {
    const n = this._options?.length ?? 0;
    if (!n) return;

    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + n) % n;
      this._gpRefresh();
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas && this._options[this._gpIdx]) {
      this._onSelect(this._options[this._gpIdx]);
      this.hide();
    }
    this._gpAWas = aDown;
  }

  hide() {
    this._visible = false;
    this._bg.setVisible(false);
    this._title.setVisible(false);
    this._cards.forEach(card => {
      card.bg.setVisible(false);
      card.text.setVisible(false);
    });
  }

  get visible() { return this._visible; }
}
