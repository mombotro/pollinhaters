import { TOWER, WORKER, SOLDIER, NECTAR_FOUNTAIN } from '../constants.js';
import MetaSave from '../systems/MetaSave.js';

export default class BuildMenu {
  constructor(scene, onSelect, getHoney, playground = false) {
    this._scene      = scene;
    this._onSelect   = onSelect;
    this._getHoney   = getHoney;
    this._playground = playground;

    const s  = { fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };
    const hs = { ...s, fontSize: '20px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 380, 440, 342, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 270, 'BUILD  (B to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    this._allItems = [
      { key: 'resin-trap',      cost: TOWER.RESIN_TRAP_COST,    label: `Resin Trap  ${TOWER.RESIN_TRAP_COST}h`,      unlockKey: 'UNLOCK_RESIN_TRAP'      },
      { key: 'guard-post',      cost: TOWER.GUARD_POST_COST,    label: `Guard Post  ${TOWER.GUARD_POST_COST}h`,      unlockKey: 'UNLOCK_GUARD_POST'      },
      { key: 'poison-honey',    cost: TOWER.POISON_HONEY_COST,  label: `Poison Honey  ${TOWER.POISON_HONEY_COST}h`,  unlockKey: 'UNLOCK_POISON_HONEY'    },
      { key: 'nectar-fountain', cost: NECTAR_FOUNTAIN.COST,     label: `Nectar Fountain  ${NECTAR_FOUNTAIN.COST}h`,  unlockKey: 'UNLOCK_NECTAR_FOUNTAIN' },
      { key: 'recruit-worker',  cost: WORKER.COST,              label: `Recruit Worker  ${WORKER.COST}h`                                                   },
      { key: 'recruit-soldier', cost: SOLDIER.COST,             label: `Recruit Soldier  ${SOLDIER.COST}h`,          unlockKey: 'UNLOCK_RECRUIT_SOLDIER' },
    ];

    this._buttons = this._allItems.map((item) => {
      const btn = scene.add.text(640, 310, item.label, s)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setInteractive();
      btn._enabled = true;
      btn.on('pointerover', () => { if (btn._enabled) btn.setColor('#ffffff'); });
      btn.on('pointerout',  () => this._gpRefresh());
      btn.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        if (!btn._enabled) return;
        this._onSelect(item.key);
        this.hide();
      });
      return btn;
    });

    this._gpIdx          = 0;
    this._gpAWas         = false;
    this._gpBWas         = false;
    this._gpDirWas       = false;
    this._visibleIndices = [];

    this.hide();
  }

  show() {
    this._visible = true;
    this._gpIdx = 0;

    const save = MetaSave.load();
    this._visibleIndices = [];

    this._allItems.forEach((item, i) => {
      const locked = !this._playground && item.unlockKey && !(save.upgrades[item.unlockKey] >= 1);
      if (locked) {
        this._buttons[i].setVisible(false).disableInteractive();
      } else {
        this._visibleIndices.push(i);
        this._buttons[i].setVisible(true).setInteractive();
      }
    });

    // Pack visible buttons with no gaps
    this._visibleIndices.forEach((itemIdx, slot) => {
      this._buttons[itemIdx].setY(310 + slot * 36);
    });

    // Resize bg to fit visible count
    const count = this._visibleIndices.length;
    const bgH   = Math.max(80, 60 + count * 36 + 20);
    this._bg.setSize(440, bgH).setY(270 + bgH / 2);

    [this._bg, this._title].forEach(o => o.setVisible(true));
    this._refreshAffordability();
    this._gpRefresh();
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(false));
    this._buttons.forEach(b => b.disableInteractive());
  }

  get visible() { return this._visible; }

  _refreshAffordability() {
    if (!this._getHoney) return;
    const honey = this._getHoney();
    this._visibleIndices.forEach(i => {
      this._buttons[i]._enabled = honey >= this._allItems[i].cost;
    });
  }

  _gpRefresh() {
    this._refreshAffordability();
    this._visibleIndices.forEach((itemIdx, slot) => {
      const btn = this._buttons[itemIdx];
      if (!btn._enabled)             btn.setColor('#555555');
      else if (slot === this._gpIdx) btn.setColor('#ffffff');
      else                           btn.setColor('#ffd700');
    });
  }

  gpUpdate(pad) {
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._visibleIndices.length) % this._visibleIndices.length;
      this._gpRefresh();
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) {
      const itemIdx = this._visibleIndices[this._gpIdx];
      if (itemIdx !== undefined && this._buttons[itemIdx]._enabled) {
        this._onSelect(this._allItems[itemIdx].key);
        this.hide();
      }
    }
    this._gpAWas = aDown;

    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWas) this.hide();
    this._gpBWas = bDown;
  }
}
