const JOY_MAX_R = 70;
const DASH_CX  = 1150;
const DASH_CY  = 620;
const DASH_R   = 50;
const BUILD_CX = 1150;
const BUILD_CY = 500;
const BUILD_R  = 50;

export default class TouchControls {
  constructor(scene, player) {
    this._scene  = scene;
    this._player = player;
    this._joyPtr  = null;
    this._dashPtr = null;
    this._aimPtr  = null;
    this._joyOriginX = 0;
    this._joyOriginY = 0;
    this._aimOriginX = 0;
    this._aimOriginY = 0;
    this._joyWasActive = false;
    this._aimWasActive = false;

    scene.input.addPointer(2);

    this._hasTouch = false;
    // Static layer drawn once on first touch
    this._staticGfx = scene.add.graphics().setScrollFactor(0).setDepth(200);
    // Dynamic layer redrawn only when joystick is active
    this._gfx = scene.add.graphics().setScrollFactor(0).setDepth(201);
    this._label = scene.add.text(DASH_CX, DASH_CY, 'DASH', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0.75).setVisible(false);
    this._buildLabel = scene.add.text(BUILD_CX, BUILD_CY, 'BUILD', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setAlpha(0.75).setVisible(false);

    scene.input.on('pointerdown',      this._onDown, this);
    scene.input.on('pointermove',      this._onMove, this);
    scene.input.on('pointerup',        this._onUp,   this);
    scene.input.on('pointerupoutside', this._onUp,   this);
  }

  _drawDashButton() {
    this._staticGfx.fillStyle(0xffaa00, 0.45);
    this._staticGfx.fillCircle(DASH_CX, DASH_CY, DASH_R);
    this._staticGfx.lineStyle(2, 0xffffff, 0.5);
    this._staticGfx.strokeCircle(DASH_CX, DASH_CY, DASH_R);
    this._label.setVisible(true);

    this._staticGfx.fillStyle(0x44aaff, 0.45);
    this._staticGfx.fillCircle(BUILD_CX, BUILD_CY, BUILD_R);
    this._staticGfx.lineStyle(2, 0xffffff, 0.5);
    this._staticGfx.strokeCircle(BUILD_CX, BUILD_CY, BUILD_R);
    this._buildLabel.setVisible(true);
  }

  _onDown(ptr) {
    if (!ptr.wasTouch) return;
    if (!this._hasTouch) {
      this._hasTouch = true;
      this._drawDashButton();
    }
    const { x, y } = ptr;
    if (Math.hypot(x - DASH_CX, y - DASH_CY) <= DASH_R) {
      if (!this._dashPtr) {
        this._dashPtr = ptr;
        this._player._touchDash = true;
      }
      return;
    }
    if (Math.hypot(x - BUILD_CX, y - BUILD_CY) <= BUILD_R) {
      const bm = this._scene.buildMenu;
      if (bm) { if (bm.visible) bm.hide(); else bm.show(); }
      return;
    }
    if (x < this._scene.scale.width * 0.55 && !this._joyPtr) {
      this._joyPtr = ptr;
      this._joyOriginX = x;
      this._joyOriginY = y;
      this._player._touchAxis.x = 0;
      this._player._touchAxis.y = 0;
    } else if (x >= this._scene.scale.width * 0.55 && !this._aimPtr) {
      this._aimPtr = ptr;
      this._aimOriginX = x;
      this._aimOriginY = y;
      this._player._touchAimActive = true;
    }
  }

  _onMove(ptr) {
    if (ptr === this._joyPtr) {
      const dx = ptr.x - this._joyOriginX;
      const dy = ptr.y - this._joyOriginY;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const intensity = Math.min(len / JOY_MAX_R, 1);
        this._player._touchAxis.x = (dx / len) * intensity;
        this._player._touchAxis.y = (dy / len) * intensity;
      }
    } else if (ptr === this._aimPtr) {
      const dx = ptr.x - this._aimOriginX;
      const dy = ptr.y - this._aimOriginY;
      if (Math.hypot(dx, dy) > 8) {
        this._player._aimAngle = Math.atan2(dy, dx);
      }
    }
  }

  _onUp(ptr) {
    if (ptr === this._joyPtr) {
      this._joyPtr = null;
      this._player._touchAxis.x = 0;
      this._player._touchAxis.y = 0;
    }
    if (ptr === this._dashPtr) {
      this._dashPtr = null;
    }
    if (ptr === this._aimPtr) {
      this._aimPtr = null;
      this._player._touchAimActive = false;
      this._player._aimAngle = null;
    }
  }

  update() {
    const hasJoy = this._joyPtr !== null;
    const hasAim = this._aimPtr !== null;
    if (!hasJoy && !this._joyWasActive && !hasAim && !this._aimWasActive) return;
    this._joyWasActive = hasJoy;
    this._aimWasActive = hasAim;

    this._gfx.clear();

    if (hasJoy) {
      const ax = this._player._touchAxis.x;
      const ay = this._player._touchAxis.y;
      this._gfx.lineStyle(3, 0xffffff, 0.4);
      this._gfx.strokeCircle(this._joyOriginX, this._joyOriginY, JOY_MAX_R);
      this._gfx.fillStyle(0xffffff, 0.5);
      this._gfx.fillCircle(this._joyOriginX + ax * JOY_MAX_R, this._joyOriginY + ay * JOY_MAX_R, 22);
    }

    if (hasAim) {
      const dx = this._aimPtr.x - this._aimOriginX;
      const dy = this._aimPtr.y - this._aimOriginY;
      const len = Math.hypot(dx, dy);
      const clampedX = len > JOY_MAX_R ? (dx / len) * JOY_MAX_R : dx;
      const clampedY = len > JOY_MAX_R ? (dy / len) * JOY_MAX_R : dy;
      this._gfx.lineStyle(3, 0xff6600, 0.4);
      this._gfx.strokeCircle(this._aimOriginX, this._aimOriginY, JOY_MAX_R);
      this._gfx.fillStyle(0xff6600, 0.5);
      this._gfx.fillCircle(this._aimOriginX + clampedX, this._aimOriginY + clampedY, 22);
    }
  }

  destroy() {
    this._scene.input.off('pointerdown',      this._onDown, this);
    this._scene.input.off('pointermove',      this._onMove, this);
    this._scene.input.off('pointerup',        this._onUp,   this);
    this._scene.input.off('pointerupoutside', this._onUp,   this);
    this._staticGfx.destroy();
    this._gfx.destroy();
    this._label.destroy();
    this._buildLabel.destroy();
  }
}
