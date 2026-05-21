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
  { key: 'QUICK_RUN_META',    label: 'Quick Run',      cost: 50,  max: 3, desc: 'Survive 1 minute less per level (min 7 min)' },
  { key: 'LONG_RUN_META',     label: 'Longer Run',     cost: 75,  max: 99, desc: 'Survive 5 minutes more per level (no cap)' },
  { key: 'HARD_MODE_META',    label: 'Hard Mode',      cost: 75,  max: 3,  desc: '+2 wasps per wave per level (self-challenge)' },
  { key: 'EXTRA_HIVES_META',  label: 'Extra Hive',     cost: 200, max: 2,  desc: '+1 enemy wasp hive per level (harder, more threats)' },
];

const BUILDABLE_UNLOCKS = [
  { key: 'UNLOCK_RESIN_TRAP',       label: 'Resin Trap',       cost: 50,  max: 1, desc: 'Unlock: slows wasps that walk through resin' },
  { key: 'UNLOCK_GUARD_POST',       label: 'Guard Post',       cost: 100, max: 1, desc: 'Unlock: guard bee that orbits and fires stingers' },
  { key: 'UNLOCK_POISON_HONEY',     label: 'Poison Honey',     cost: 150, max: 1, desc: 'Unlock: lure that poisons wasps and sends them to hive' },
  { key: 'UNLOCK_NECTAR_FOUNTAIN',  label: 'Nectar Fountain',  cost: 150, max: 1, desc: 'Unlock: generates honey passively over time' },
  { key: 'UNLOCK_RECRUIT_SOLDIER',  label: 'Recruit Soldier',  cost: 100, max: 1, desc: 'Unlock: hire soldier bees during a run' },
];

const ROW_H         = 52;
const SCROLL_TOP    = 145;
const SCROLL_BOTTOM = 625;
const SCROLL_H      = SCROLL_BOTTOM - SCROLL_TOP;
const COL_NAME      = 180;
const COL_LVL       = 720;
const COL_BTN       = 940;

export default class MetaUpgradeScene extends Phaser.Scene {
  constructor() { super('MetaUpgradeScene'); }

  create() {
    const cx = 640;

    this.add.text(cx, 40, 'UPGRADES', {
      fontSize: '44px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._jellyText = this.add.text(cx, 82, '', {
      fontSize: '26px', color: '#ffcc00',
    }).setOrigin(0.5);

    // Tab buttons
    this._tabUpgradeBtn = this.add.text(cx - 120, 110, '[ UPGRADES ]', {
      fontSize: '19px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._tabBuildBtn = this.add.text(cx + 120, 110, '[ BUILDABLES ]', {
      fontSize: '19px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._tabUpgradeBtn.on('pointerdown', () => this._switchTab('upgrades'));
    this._tabBuildBtn.on('pointerdown',   () => this._switchTab('buildables'));

    // Scroll mask
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(0, SCROLL_TOP, 1280, SCROLL_H);
    const scrollMask = maskGfx.createGeometryMask();

    this._upgradeScrollY     = 0;
    this._buildableScrollY   = 0;
    this._upgradeMaxScroll   = Math.max(0, UPGRADES.length * ROW_H - SCROLL_H);
    this._buildableMaxScroll = Math.max(0, BUILDABLE_UNLOCKS.length * ROW_H - SCROLL_H);
    this._activeTab = 'upgrades';

    this._upgradeRows   = this._buildRows(UPGRADES, scrollMask);
    this._buildableRows = this._buildRows(BUILDABLE_UNLOCKS, scrollMask);

    // Scroll arrows
    this._arrowUp   = this.add.text(cx, SCROLL_TOP - 14, '▲', { fontSize: '18px', color: '#888888' }).setOrigin(0.5);
    this._arrowDown = this.add.text(cx, SCROLL_BOTTOM + 14, '▼', { fontSize: '18px', color: '#888888' }).setOrigin(0.5);

    // Separator lines
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, 0x444444, 1);
    sepGfx.lineBetween(100, SCROLL_TOP - 1, 1180, SCROLL_TOP - 1);
    sepGfx.lineBetween(100, SCROLL_BOTTOM + 1, 1180, SCROLL_BOTTOM + 1);

    // Footer buttons
    this._refundBtn = this.add.text(cx - 220, 660, '[ REFUND ALL ]', {
      fontSize: '20px', color: '#ffaa00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._refundBtn.on('pointerover', () => this._refundBtn.setColor('#ffffff'));
    this._refundBtn.on('pointerout',  () => this._refundBtn.setColor('#ffaa00'));
    this._refundBtn.on('pointerdown', () => this._doRefund());

    this._resetBtn = this.add.text(cx + 220, 660, '[ RESET SAVE ]', {
      fontSize: '20px', color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._resetBtn.on('pointerover', () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff8888'); });
    this._resetBtn.on('pointerout',  () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff4444'); });
    this._resetBtn.on('pointerdown', () => this._doReset());

    this._backBtn = this.add.text(cx, 703, '[ BACK TO MENU ]', {
      fontSize: '26px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._backBtn.on('pointerover', () => this._backBtn.setColor('#ffffff'));
    this._backBtn.on('pointerout',  () => this._backBtn.setColor('#ffd700'));
    this._backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.on('wheel', (_ptr, _objs, _dx, deltaY) => {
      this._doScroll(deltaY > 0 ? 48 : -48);
    });

    this._gpIdx    = 0;
    this._gpAWas   = true;
    this._gpBWas   = true;
    this._gpDirWas = true;
    this._gpLRWas  = true;

    this._switchTab('upgrades');
    this._refresh();
  }

  _buildRows(defs, scrollMask) {
    return defs.map((def, i) => {
      const baseY = SCROLL_TOP + i * ROW_H + ROW_H / 2;

      const nameText = this.add.text(COL_NAME, baseY, def.label, {
        fontSize: '21px', color: '#ffffff',
      }).setOrigin(0, 0.5).setMask(scrollMask);

      const descText = this.add.text(COL_NAME, baseY + 16, def.desc, {
        fontSize: '13px', color: '#888888',
      }).setOrigin(0, 0.5).setMask(scrollMask);

      const levelText = this.add.text(COL_LVL, baseY, '', {
        fontSize: '21px', color: '#cccccc',
      }).setOrigin(0.5, 0.5).setMask(scrollMask);

      const btn = this.add.text(COL_BTN, baseY, '', {
        fontSize: '19px', color: '#ffd700',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setMask(scrollMask);

      btn.on('pointerover', () => { if (btn._enabled) btn.setColor('#ffffff'); });
      btn.on('pointerout',  () => { if (btn._enabled) btn.setColor('#ffd700'); });
      btn.on('pointerdown', () => {
        if (!btn._enabled) return;
        MetaSave.purchaseUpgrade(def.key, def.cost);
        this._refresh();
      });

      return { def, nameText, descText, levelText, btn, baseY };
    });
  }

  _switchTab(tab) {
    this._activeTab = tab;

    this._upgradeRows.forEach(r => {
      r.nameText.setVisible(tab === 'upgrades');
      r.descText.setVisible(tab === 'upgrades');
      r.levelText.setVisible(tab === 'upgrades');
      r.btn.setVisible(tab === 'upgrades');
    });
    this._buildableRows.forEach(r => {
      r.nameText.setVisible(tab === 'buildables');
      r.descText.setVisible(tab === 'buildables');
      r.levelText.setVisible(tab === 'buildables');
      r.btn.setVisible(tab === 'buildables');
    });

    this._tabUpgradeBtn.setColor(tab === 'upgrades'   ? '#ffd700' : '#888888');
    this._tabBuildBtn.setColor(  tab === 'buildables' ? '#ffd700' : '#888888');

    const rows = tab === 'upgrades' ? this._upgradeRows : this._buildableRows;
    this._navObjs    = [...rows.map(r => r.nameText), this._refundBtn, this._resetBtn, this._backBtn];
    this._navColors  = [...rows.map(() => '#ffffff'), '#ffaa00', '#ff4444', '#ffd700'];
    this._navActions = [
      ...rows.map(r => () => {
        if (r.btn._enabled) { MetaSave.purchaseUpgrade(r.def.key, r.def.cost); this._refresh(); }
      }),
      () => this._doRefund(),
      () => this._doReset(),
      () => this.scene.start('MenuScene'),
    ];
    this._gpIdx = 0;

    this._repositionRows();
    this._updateArrows();
    this._refresh();
  }

  _doScroll(dy) {
    if (this._activeTab === 'upgrades') {
      this._upgradeScrollY = Phaser.Math.Clamp(this._upgradeScrollY + dy, 0, this._upgradeMaxScroll);
    } else {
      this._buildableScrollY = Phaser.Math.Clamp(this._buildableScrollY + dy, 0, this._buildableMaxScroll);
    }
    this._repositionRows();
    this._updateArrows();
  }

  _repositionRows() {
    const scrollY = this._activeTab === 'upgrades' ? this._upgradeScrollY : this._buildableScrollY;
    const rows    = this._activeTab === 'upgrades' ? this._upgradeRows    : this._buildableRows;
    rows.forEach((row, i) => {
      const y = SCROLL_TOP + i * ROW_H + ROW_H / 2 - scrollY;
      row.nameText.setY(y);
      row.descText.setY(y + 16);
      row.levelText.setY(y);
      row.btn.setY(y);
    });
  }

  _updateArrows() {
    const scrollY   = this._activeTab === 'upgrades' ? this._upgradeScrollY   : this._buildableScrollY;
    const maxScroll = this._activeTab === 'upgrades' ? this._upgradeMaxScroll  : this._buildableMaxScroll;
    this._arrowUp.setAlpha(scrollY > 0 ? 1 : 0.2);
    this._arrowDown.setAlpha(scrollY < maxScroll ? 1 : 0.2);
  }

  _ensureVisible(rowIdx) {
    const rows    = this._activeTab === 'upgrades' ? this._upgradeRows    : this._buildableRows;
    const scrollY = this._activeTab === 'upgrades' ? this._upgradeScrollY : this._buildableScrollY;
    if (rowIdx >= rows.length) return;
    const rowTop = rowIdx * ROW_H;
    const rowBot = rowTop + ROW_H;
    if (rowTop < scrollY) {
      this._doScroll(rowTop - scrollY);
    } else if (rowBot > scrollY + SCROLL_H) {
      this._doScroll(rowBot - (scrollY + SCROLL_H));
    }
  }

  _doRefund() {
    const s = MetaSave.load();
    [...UPGRADES, ...BUILDABLE_UNLOCKS].forEach(def => {
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

    [...this._upgradeRows, ...this._buildableRows].forEach(({ def, levelText, btn }) => {
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
    this._updateArrows();
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

    // Left/right: switch tabs
    const lrDown = pad.buttons[14]?.pressed || pad.buttons[15]?.pressed ||
                   Math.abs(pad.leftStick.x) > 0.4;
    if (lrDown && !this._gpLRWas) {
      const tabs = ['upgrades', 'buildables'];
      const idx  = tabs.indexOf(this._activeTab);
      const dx   = (pad.buttons[14]?.pressed || pad.leftStick.x < -0.4) ? -1 : 1;
      this._switchTab(tabs[(idx + dx + tabs.length) % tabs.length]);
    }
    this._gpLRWas = lrDown;

    // Up/down: navigate rows
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._navObjs.length) % this._navObjs.length;
      this._gpRefresh();
      const rows = this._activeTab === 'upgrades' ? this._upgradeRows : this._buildableRows;
      if (this._gpIdx < rows.length) this._ensureVisible(this._gpIdx);
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
