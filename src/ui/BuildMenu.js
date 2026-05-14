import { TOWER, WORKER, SOLDIER, NECTAR_FOUNTAIN } from '../constants.js';

export default class BuildMenu {
  constructor(scene, onSelect, getHoney) {
    this._scene    = scene;
    this._onSelect = onSelect;
    this._getHoney = getHoney;

    const s  = { fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };
    const hs = { ...s, fontSize: '20px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 380, 440, 342, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 270, 'BUILD  (B to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    this._items = [
      { key: 'resin-trap',      cost: TOWER.RESIN_TRAP_COST,    label: `Resin Trap  ${TOWER.RESIN_TRAP_COST}h`      },
      { key: 'guard-post',      cost: TOWER.GUARD_POST_COST,    label: `Guard Post  ${TOWER.GUARD_POST_COST}h`      },
      { key: 'poison-honey',    cost: TOWER.POISON_HONEY_COST,  label: `Poison Honey  ${TOWER.POISON_HONEY_COST}h`  },
      { key: 'nectar-fountain', cost: NECTAR_FOUNTAIN.COST,     label: `Nectar Fountain  ${NECTAR_FOUNTAIN.COST}h`  },
      { key: 'recruit-worker',  cost: WORKER.COST,              label: `Recruit Worker  ${WORKER.COST}h`            },
      { key: 'recruit-soldier', cost: SOLDIER.COST,             label: `Recruit Soldier  ${SOLDIER.COST}h`          },
    ];

    this._buttons = this._items.map((item, i) => {
      const btn = scene.add.text(640, 310 + i * 36, item.label, s)
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

    this._gpIdx    = 0;
    this._gpAWas   = false;
    this._gpBWas   = false;
    this._gpDirWas = false;

    this.hide();
  }

  show() {
    this._visible = true;
    this._gpIdx = 0;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(true));
    this._refreshAffordability();
    this._gpRefresh();
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(false));
  }

  get visible() { return this._visible; }

  _refreshAffordability() {
    if (!this._getHoney) return;
    const honey = this._getHoney();
    this._items.forEach((item, i) => {
      this._buttons[i]._enabled = honey >= item.cost;
    });
  }

  _gpRefresh() {
    this._refreshAffordability();
    this._buttons.forEach((b, i) => {
      if (i === this._gpIdx)  b.setColor('#ffffff');
      else if (!b._enabled)   b.setColor('#555555');
      else                    b.setColor('#ffd700');
    });
  }

  gpUpdate(pad) {
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._buttons.length) % this._buttons.length;
      this._gpRefresh();
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) {
      if (this._buttons[this._gpIdx]._enabled) {
        this._onSelect(this._items[this._gpIdx].key);
        this.hide();
      }
    }
    this._gpAWas = aDown;

    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWas) this.hide();
    this._gpBWas = bDown;
  }
}
