import Phaser from 'phaser';
import MetaSave from '../systems/MetaSave.js';

const UPGRADES = [
  { key: 'BEE_SPEED_META',    label: 'Bee Speed',      cost: 50,  max: 3, desc: '+20 speed per level' },
  { key: 'BEE_HP_META',       label: 'Bee Health',     cost: 75,  max: 3, desc: '+2 max HP per level' },
  { key: 'HIVE_HP_META',      label: 'Hive Health',    cost: 75,  max: 3, desc: '+5 hive max HP per level' },
  { key: 'HIVE_STORAGE_META', label: 'Honey Storage',  cost: 100, max: 3, desc: '+50 storage per level' },
  { key: 'START_WORKER',      label: 'Start: Worker',  cost: 100, max: 1, desc: 'Begin each run with 1 worker bee' },
  { key: 'START_ARMOR',       label: 'Start: Armor',   cost: 150, max: 1, desc: 'Begin with 1 armor' },
  { key: 'START_HONEY',       label: 'Start: Honey',   cost: 80,  max: 1, desc: 'Begin with 30 honey' },
  { key: 'START_GUARD',       label: 'Start: Guard',   cost: 200, max: 1, desc: 'Begin with 1 guard post' },
  { key: 'START_SOLDIER',    label: 'Start: Soldier', cost: 120, max: 1, desc: 'Begin with 1 soldier bee escort' },
  { key: 'SOLDIER_DMG_META', label: 'Soldier Damage', cost: 100, max: 3, desc: '+1 soldier damage per level' },
];

export default class MetaUpgradeScene extends Phaser.Scene {
  constructor() { super('MetaUpgradeScene'); }

  create() {
    const cx = 640;

    this.add.text(cx, 50, 'UPGRADES', {
      fontSize: '48px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._jellyText = this.add.text(cx, 110, '', {
      fontSize: '28px', color: '#ffcc00',
    }).setOrigin(0.5);

    this._rows = [];
    UPGRADES.forEach((def, i) => {
      const y = 155 + i * 54;

      const nameText = this.add.text(200, y, def.label, {
        fontSize: '22px', color: '#ffffff',
      }).setOrigin(0, 0.5);

      const descText = this.add.text(200, y + 18, def.desc, {
        fontSize: '14px', color: '#aaaaaa',
      }).setOrigin(0, 0.5);

      const levelText = this.add.text(700, y, '', {
        fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5, 0.5);

      const btn = this.add.text(900, y, '', {
        fontSize: '22px', color: '#ffd700',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => { if (btn._enabled) btn.setColor('#ffffff'); });
      btn.on('pointerout',  () => { if (btn._enabled) btn.setColor('#ffd700'); });
      btn.on('pointerdown', () => {
        if (!btn._enabled) return;
        MetaSave.purchaseUpgrade(def.key, def.cost);
        this._refresh();
      });

      this._rows.push({ def, nameText, descText, levelText, btn });
    });

    const refundBtn = this.add.text(cx - 220, 670, '[ REFUND ALL ]', {
      fontSize: '20px', color: '#ffaa00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    refundBtn.on('pointerover', () => refundBtn.setColor('#ffffff'));
    refundBtn.on('pointerout',  () => refundBtn.setColor('#ffaa00'));
    refundBtn.on('pointerdown', () => {
      const s = MetaSave.load();
      UPGRADES.forEach(def => {
        s.jellyBalance += (s.upgrades[def.key] ?? 0) * def.cost;
        s.upgrades[def.key] = 0;
      });
      MetaSave.save(s);
      this._refresh();
    });

    const resetBtn = this.add.text(cx + 220, 670, '[ RESET SAVE ]', {
      fontSize: '20px', color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => { if (!resetBtn._pending) resetBtn.setColor('#ff8888'); });
    resetBtn.on('pointerout',  () => { if (!resetBtn._pending) resetBtn.setColor('#ff4444'); });
    resetBtn.on('pointerdown', () => {
      if (!resetBtn._pending) {
        resetBtn._pending = true;
        resetBtn.setText('[ CONFIRM? ]').setColor('#ff8888');
        this.time.delayedCall(3000, () => {
          if (resetBtn._pending) {
            resetBtn._pending = false;
            resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
          }
        });
      } else {
        resetBtn._pending = false;
        MetaSave.reset();
        resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
        this._refresh();
      }
    });

    const backBtn = this.add.text(cx, 710, '[ BACK TO MENU ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#ffd700'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this._refresh();
  }

  _refresh() {
    const s = MetaSave.load();
    this._jellyText.setText(`Royal Jelly: ${s.jellyBalance}`);

    this._rows.forEach(({ def, levelText, btn }) => {
      const level = s.upgrades[def.key] ?? 0;
      const maxed = level >= def.max;
      const canAfford = s.jellyBalance >= def.cost;

      levelText.setText(`${level} / ${def.max}`);

      if (maxed) {
        btn.setText('MAXED');
        btn.setColor('#555555');
        btn._enabled = false;
      } else if (canAfford) {
        btn.setText(`[ BUY ${def.cost}j ]`);
        btn.setColor('#ffd700');
        btn._enabled = true;
      } else {
        btn.setText(`[ BUY ${def.cost}j ]`);
        btn.setColor('#555555');
        btn._enabled = false;
      }
    });
  }
}
