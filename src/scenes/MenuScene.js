import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._selIdx = 0;
    this._gpAWasDown   = true;
    this._gpDirWasDown = true;
    this._gpBWasDown   = true;
    const cx = 640, cy = 360;

    this._headerDom = this.add.dom(cx, cy - 260).createFromHTML(`
      <div style="position:relative;width:300px;text-align:center;">
        <img src="bee.gif" style="width:180px;display:block;margin:-40px auto 0;">
        <img src="splash.png" style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;z-index:1;">
      </div>
    `);

    this.add.text(cx, cy + 90, 'Protect the hive. Survive 10 minutes.', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const btnStart = this.add.text(cx, cy + 170, '[ START ]', {
      fontSize: '36px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnStart.on('pointerover', () => { this._selIdx = 0; this._refreshHighlight(); });
    btnStart.on('pointerout',  () => this._refreshHighlight());
    btnStart.on('pointerdown', () => this.scene.start('GameScene'));

    const btnUpgrades = this.add.text(cx, cy + 225, '[ UPGRADES ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnUpgrades.on('pointerover', () => { this._selIdx = 1; this._refreshHighlight(); });
    btnUpgrades.on('pointerout',  () => this._refreshHighlight());
    btnUpgrades.on('pointerdown', () => this.scene.start('MetaUpgradeScene'));

    const btnPlayground = this.add.text(cx, cy + 275, '[ PLAYGROUND ]', {
      fontSize: '22px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnPlayground.on('pointerover', () => { this._selIdx = 2; this._refreshHighlight(); });
    btnPlayground.on('pointerout',  () => this._refreshHighlight());
    btnPlayground.on('pointerdown', () => this.scene.start('GameScene', { playground: true }));

    const btnControls = this.add.text(cx, cy + 315, '[ CONTROLS ]', {
      fontSize: '20px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnControls.on('pointerover', () => { this._selIdx = 3; this._refreshHighlight(); });
    btnControls.on('pointerout',  () => this._refreshHighlight());
    btnControls.on('pointerdown', () => this._showControls());

    this.add.text(cx, 700, 'alpha v1', {
      fontSize: '14px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._btns = [btnStart, btnUpgrades, btnPlayground, btnControls];
    this._actions = [
      () => this.scene.start('GameScene'),
      () => this.scene.start('MetaUpgradeScene'),
      () => this.scene.start('GameScene', { playground: true }),
      () => this._showControls(),
    ];
    this._refreshHighlight();
  }

  _showControls() {
    if (this._controlsObjs) return;
    this._headerDom.setVisible(false);
    const cx = 640, cy = 360;
    const D = 300;
    const objs = [];

    const add = obj => { objs.push(obj); return obj; };

    add(this.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.01).setDepth(D - 1).setInteractive());
    add(this.add.rectangle(cx, cy, 760, 510, 0x000000, 0.93).setDepth(D));
    add(this.add.text(cx, cy - 225, 'CONTROLS', {
      fontSize: '30px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D));

    const s = { fontSize: '17px', color: '#ffffff', fontFamily: 'monospace' };
    const h = { ...s, color: '#ffdd44', fontSize: '19px', fontStyle: 'bold' };
    const lh = 32, top = cy - 165;
    const col1 = cx - 330, col2 = cx + 60;

    const kbLines = ['KEYBOARD', 'WASD / Arrows  —  Move', 'Space          —  Dash', 'Right-click    —  Aim', 'B              —  Build menu', 'Esc            —  Pause'];
    const gpLines = ['CONTROLLER', 'Left stick     —  Move', 'A button       —  Dash', 'Right stick    —  Aim', 'B button       —  Build menu', 'Start          —  Pause'];

    kbLines.forEach((label, i) =>
      add(this.add.text(col1, top + i * lh, label, i === 0 ? h : s).setOrigin(0, 0.5).setDepth(D))
    );
    gpLines.forEach((label, i) =>
      add(this.add.text(col2, top + i * lh, label, i === 0 ? h : s).setOrigin(0, 0.5).setDepth(D))
    );

    const btnClose = add(this.add.text(cx, cy + 210, '[ CLOSE ]', {
      fontSize: '22px', color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D).setInteractive({ useHandCursor: true }));
    btnClose.on('pointerover', () => btnClose.setColor('#ff8888'));
    btnClose.on('pointerout',  () => btnClose.setColor('#ff4444'));
    btnClose.on('pointerdown', () => this._hideControls());

    this._controlsObjs = objs;
  }

  _hideControls() {
    if (!this._controlsObjs) return;
    this._controlsObjs.forEach(o => o.destroy());
    this._controlsObjs = null;
    this._headerDom.setVisible(true);
  }

  _refreshHighlight() {
    this._btns.forEach((b, i) =>
      b.setColor(i === this._selIdx ? '#ffffff' : '#ffd700')
    );
  }

  update() {
    const gp = this.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    if (!pad) return;

    // B closes controls panel
    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWasDown && this._controlsObjs) this._hideControls();
    this._gpBWasDown = bDown;
    if (this._controlsObjs) return;

    // D-pad / left stick navigate
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWasDown) {
      const dy = pad.buttons[12]?.pressed || pad.leftStick.y < -0.4 ? -1 : 1;
      this._selIdx = (this._selIdx + dy + this._btns.length) % this._btns.length;
      this._refreshHighlight();
    }
    this._gpDirWasDown = dirDown;

    // A confirms
    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWasDown) this._actions[this._selIdx]();
    this._gpAWasDown = aDown;
  }
}
