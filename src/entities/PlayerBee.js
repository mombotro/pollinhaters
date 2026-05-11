import Phaser from 'phaser';
import { BEE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class PlayerBee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, onFire) {
    super(scene, x, y, 'player-bee');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.hp = BEE.HP;
    this.maxHp = BEE.HP;
    this.alive = true;
    this._onFire = onFire ?? null;
    this._lastFired = 0;
    this._cursors = scene.input.keyboard.createCursorKeys();
    this._wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this._speed = BEE.SPEED;
    this._sapCapacity = BEE.SAP_CAPACITY;
    this._stingerDamage = BEE.STINGER_DAMAGE;
    this._stingerRate = BEE.STINGER_RATE;
    this._stingerRange = BEE.STINGER_RANGE;
    this._stingerSpeed = BEE.STINGER_SPEED;
    this.armor = 0;
    this.setDrag(800, 800);
    
    this.isDashing = false;
    this.dashEndTime = 0;
    this.lastDashTime = 0;
    this._dashTargetRotation = null;
    this._space = scene.input.keyboard.addKey('SPACE');
    this._touchAxis = { x: 0, y: 0 };
    this._touchDash = false;
    this._touchAimActive = false;
    this._aimAngle = null;
    this._gpAxis = { x: 0, y: 0 };
    this._gpAWasDown = false;
  }

  update(time, delta) {
    if (!this.alive) return;

    if (this.isDashing) {
      if (time >= this.dashEndTime) {
        this.isDashing = false;
        this._dashTargetRotation = null;
        this.clearTint();
      } else if (this._dashTargetRotation !== null) {
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this._dashTargetRotation, 0.5);
      }
    } else {
      if ((Phaser.Input.Keyboard.JustDown(this._space) || this._touchDash) && time - this.lastDashTime >= BEE.DASH_COOLDOWN) {

        this._touchDash = false;
        // Determine dash direction from held keys / gamepad; fall back to forward
        const left  = this._cursors.left.isDown  || this._wasd.A.isDown;
        const right = this._cursors.right.isDown || this._wasd.D.isDown;
        const up    = this._cursors.up.isDown    || this._wasd.W.isDown;
        const down  = this._cursors.down.isDown  || this._wasd.S.isDown;
        let ax = (right ? 1 : 0) - (left ? 1 : 0);
        let ay = (down  ? 1 : 0) - (up   ? 1 : 0);
        if (ax === 0 && ay === 0) { ax = this._gpAxis.x; ay = this._gpAxis.y; }

        const dashAngle = (ax !== 0 || ay !== 0)
          ? Math.atan2(ay, ax)
          : this.rotation - Math.PI / 2;

        this._dashTargetRotation = dashAngle - Math.PI / 2;
        this.isDashing = true;
        this.dashEndTime = time + BEE.DASH_DURATION;
        this.lastDashTime = time;
        this.setTint(0x88ffff);

        const dashSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
        this.setVelocity(Math.cos(dashAngle) * dashSpeed, Math.sin(dashAngle) * dashSpeed);
      }
    }

    // Aim: mouse right-click first, then touch/gamepad can set if mouse not active
    const ptr = this.scene.input.mousePointer;
    if (ptr && ptr.rightButtonDown()) {
      const cam = this.scene.cameras.main;
      const beeScreenX = (this.x - cam.scrollX) * cam.zoom;
      const beeScreenY = (this.y - cam.scrollY) * cam.zoom;
      this._aimAngle = Math.atan2(ptr.y - beeScreenY, ptr.x - beeScreenX);
    } else if (!this._touchAimActive) {
      this._aimAngle = null;
    }
    this._readGamepad();

    if (this.isDashing) {
      this.setMaxVelocity(this._speed * BEE.DASH_SPEED_MULTIPLIER, this._speed * BEE.DASH_SPEED_MULTIPLIER);
      this.setAcceleration(0, 0);
    } else {
      this.setMaxVelocity(this._speed, this._speed);
      this._move();
    }
    
    this._autoFire(time);
  }

  _readGamepad() {
    const gp = this.scene.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    this._gpAxis = { x: 0, y: 0 };
    if (!pad) return;

    const DEAD = 0.15;

    // Left stick + D-pad movement
    let gx = Math.abs(pad.leftStick.x) > DEAD ? pad.leftStick.x : 0;
    let gy = Math.abs(pad.leftStick.y) > DEAD ? pad.leftStick.y : 0;
    if (pad.buttons[14]?.pressed) gx = -1;
    if (pad.buttons[15]?.pressed) gx =  1;
    if (pad.buttons[12]?.pressed) gy = -1;
    if (pad.buttons[13]?.pressed) gy =  1;
    const len = Math.hypot(gx, gy);
    if (len > 1) { gx /= len; gy /= len; }
    this._gpAxis = { x: gx, y: gy };

    // A button (index 0) → dash (rising edge)
    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWasDown) this._touchDash = true;
    this._gpAWasDown = aDown;

    // B button (index 1) → toggle build menu (rising edge)
    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWasDown) {
      const bm = this.scene.buildMenu;
      if (bm) { if (bm.visible) bm.hide(); else bm.show(); }
    }
    this._gpBWasDown = bDown;

    // Right stick → aim (RT check removed: Phaser analog threshold unreliable)
    const rx = pad.rightStick.x;
    const ry = pad.rightStick.y;
    if (Math.hypot(rx, ry) > DEAD) {
      this._aimAngle = Math.atan2(ry, rx);
    }
  }

  _move() {
    const left  = this._cursors.left.isDown  || this._wasd.A.isDown;
    const right = this._cursors.right.isDown || this._wasd.D.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.W.isDown;
    const down  = this._cursors.down.isDown  || this._wasd.S.isDown;

    let ax = (right ? 1 : 0) - (left ? 1 : 0);
    let ay = (down  ? 1 : 0) - (up   ? 1 : 0);

    if (ax === 0 && ay === 0) {
      ax = this._touchAxis.x || this._gpAxis.x;
      ay = this._touchAxis.y || this._gpAxis.y;
    } else if (ax !== 0 && ay !== 0) {
      ax *= 0.707; ay *= 0.707;
    }

    const accel = this._speed * 10;
    this.setAcceleration(ax * accel, ay * accel);

    if (this._aimAngle !== null) {
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this._aimAngle - Math.PI / 2, 0.15);
    } else if (this.body.velocity.lengthSq() > 10) {
      const targetRotation = this.body.velocity.angle() + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
    }
  }

  _autoFire(time) {
    if (!this._onFire || time - this._lastFired < this._stingerRate) return;
    const tailAngle = this.rotation + Math.PI / 2;
    const offset = this.height * 0.5;
    const spawnX = this.x + Math.cos(tailAngle) * offset;
    const spawnY = this.y + Math.sin(tailAngle) * offset;
    const fired = this._onFire(spawnX, spawnY, this._stingerRange, this._stingerDamage, this._stingerSpeed, tailAngle);
    if (fired) { this._lastFired = time; SoundSynth.play('shoot'); }
  }

  // Returns true if bee died
  takeDamage(amount) {
    if (!this.alive || this.isDashing) return false;
    const actual = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - actual);
    SoundSynth.play('player-hit');
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.alive = false;
      this.setVisible(false).setActive(false);
      this.body.enable = false;
    }
    return this.hp <= 0;
  }

  respawn(x, y) {
    this.hp = this.maxHp;
    this.alive = true;
    this.setPosition(x, y).setVisible(true).setActive(true);
    this.body.enable = true;
    this.clearTint();
  }
}
