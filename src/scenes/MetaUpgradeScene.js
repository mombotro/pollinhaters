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
  { key: 'START_SOLDIER',     label: 'Start: Soldier', cost: 120, max: 1, desc: 'Begin with 1 soldier bee escort' },
  { key: 'SOLDIER_DMG_META',  label: 'Soldier Damage', cost: 100, max: 3, desc: '+1 soldier damage per level' },
  { key: 'QUICK_RUN_META',   label: 'Quick Run',      cost: 50,  max: 3, desc: 'Survive 1 minute less per level (min 7 min)' },
  { key: 'HARD_MODE_META',   label: 'Hard Mode',      cost: 75,  max: 3, desc: '+2 wasps per wave per level (self-challenge)' },
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

    this._refundBtn = this.add.text(cx - 220, 670, '[ REFUND ALL ]', {
      fontSize: '20px', color: '#ffaa00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._refundBtn.on('pointerover', () => this._refundBtn.setColor('#ffffff'));
    this._refundBtn.on('pointerout',  () => this._refundBtn.setColor('#ffaa00'));
    this._refundBtn.on('pointerdown', () => this._doRefund());

    this._resetBtn = this.add.text(cx + 220, 670, '[ RESET SAVE ]', {
      fontSize: '20px', color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._resetBtn.on('pointerover', () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff8888'); });
    this._resetBtn.on('pointerout',  () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff4444'); });
    this._resetBtn.on('pointerdown', () => this._doReset());

    this._backBtn = this.add.text(cx, 710, '[ BACK TO MENU ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._backBtn.on('pointerover', () => this._backBtn.setColor('#ffffff'));
    this._backBtn.on('pointerout',  () => this._backBtn.setColor('#ffd700'));
    this._backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Gamepad nav: rows 0-9, refund=10, reset=11, back=12
    this._navObjs    = [...this._rows.map(r => r.nameText), this._refundBtn, this._resetBtn, this._backBtn];
    this._navColors  = [...this._rows.map(() => '#ffffff'), '#ffaa00', '#ff4444', '#ffd700'];
    this._navActions = [
      ...this._rows.map(r => () => { if (r.btn._enabled) { MetaSave.purchaseUpgrade(r.def.key, r.def.cost); this._refresh(); } }),
      () => this._doRefund(),
      () => this._doReset(),
      () => this.scene.start('MenuScene'),
    ];
    this._gpIdx    = 0;
    this._gpAWas   = true;
    this._gpBWas   = true;
    this._gpDirWas = true;

    this._refresh();
  }

  _doRefund() {
    const s = MetaSave.load();
    UPGRADES.forEach(def => {
      s.jellyBalance += (s.upgrades[def.key] ?? 0) * def.cost;
      s.upgrades[def.key] = 0;
    });
    MetaSave.save(s);
    this._refresh();
  }

  _doReset() {
    if (!this._resetBtn._pending) {
      this._resetBtn._pending = true;
      this._resetBtn.setText('[ CONFIRM? ]').setColor('#ff8888');
      this.time.delayedCall(3000, () => {
        if (this._resetBtn._pending) {
          this._resetBtn._pending = false;
          this._resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
          this._gpRefresh();
        }
      });
    } else {
      this._resetBtn._pending = false;
      MetaSave.reset();
      this._resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
      this._refresh();
    }
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
        btn.setText('MAXED').setColor('#555555');
        btn._enabled = false;
      } else if (canAfford) {
        btn.setText(`[ BUY ${def.cost}j ]`).setColor('#ffd700');
        btn._enabled = true;
      } else {
        btn.setText(`[ BUY ${def.cost}j ]`).setColor('#555555');
        btn._enabled = false;
      }
    });
    this._gpRefresh();
  }

  _gpRefresh() {
    if (!this._navObjs) return;
    this._navObjs.forEach((obj, i) => {
      obj.setColor(i === this._gpIdx ? '#ffff44' : this._navColors[i]);
    });
  }

  update() {
    const gp  = this.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    if (!pad) return;

    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._navObjs.length) % this._navObjs.length;
      this._gpRefresh();
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) this._navActions[this._gpIdx]?.();
    this._gpAWas = aDown;

    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWas) this.scene.start('MenuScene');
    this._gpBWas = bDown;
  }
}
