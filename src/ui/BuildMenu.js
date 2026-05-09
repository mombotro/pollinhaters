import { TOWER, WORKER } from '../constants.js';

export default class BuildMenu {
  constructor(scene, onSelect) {
    this._scene = scene;
    this._onSelect = onSelect;

    const s = { fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };
    const hs = { ...s, fontSize: '20px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 380, 440, 240, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 270, 'BUILD  (B to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    const items = [
      { key: 'resin-trap',     label: `Resin Trap  ${TOWER.RESIN_TRAP_COST}h`  },
      { key: 'guard-post',     label: `Guard Post  ${TOWER.GUARD_POST_COST}h`  },
      { key: 'recruit-worker', label: `Recruit Worker  ${WORKER.COST}h`        },
    ];

    this._buttons = items.map((item, i) => {
      const btn = scene.add.text(640, 310 + i * 36, item.label, s)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setInteractive();
      btn.on('pointerover',  () => btn.setColor('#ffffff'));
      btn.on('pointerout',   () => btn.setColor('#ffd700'));
      btn.on('pointerdown',  (pointer, localX, localY, event) => {
        event.stopPropagation();
        this._onSelect(item.key);
        this.hide();
      });
      return btn;
    });

    this.hide();
  }

  show() {
    this._visible = true;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(true));
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(false));
  }

  get visible() { return this._visible; }
}
