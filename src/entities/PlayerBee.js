import Phaser from 'phaser';
import { BEE } from '../constants.js';

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
    this._aimAngle = null; // non-null when right-click held
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
        // Determine dash direction from held keys; fall back to current facing
        const left  = this._cursors.left.isDown  || this._wasd.A.isDown;
        const right = this._cursors.right.isDown || this._wasd.D.isDown;
        const up    = this._cursors.up.isDown    || this._wasd.W.isDown;
        const down  = this._cursors.down.isDown  || this._wasd.S.isDown;
        const ax = (right ? 1 : 0) - (left ? 1 : 0);
        const ay = (down  ? 1 : 0) - (up   ? 1 : 0);

        const dashAngle = (ax !== 0 || ay !== 0)
          ? Math.atan2(ay, ax)
          : this.rotation + Math.PI / 2;

        this._dashTargetRotation = dashAngle - Math.PI / 2;
        this.isDashing = true;
        this.dashEndTime = time + BEE.DASH_DURATION;
        this.lastDashTime = time;
        this.setTint(0x88ffff);

        const dashSpeed = this._speed * BEE.DASH_SPEED_MULTIPLIER;
        this.setVelocity(Math.cos(dashAngle) * dashSpeed, Math.sin(dashAngle) * dashSpeed);
      }
    }

    // Right-click aim: update aim angle from mouse world position
    const ptr = this.scene.input.mousePointer;
    if (ptr && ptr.rightButtonDown()) {
      this._aimAngle = Math.atan2(ptr.worldY - this.y, ptr.worldX - this.x);
    } else {
      this._aimAngle = null;
    }

    if (this.isDashing) {
      this.setMaxVelocity(this._speed * BEE.DASH_SPEED_MULTIPLIER, this._speed * BEE.DASH_SPEED_MULTIPLIER);
      this.setAcceleration(0, 0);
    } else {
      this.setMaxVelocity(this._speed, this._speed);
      this._move();
    }
    
    this._autoFire(time);
  }

  _move() {
    const left  = this._cursors.left.isDown  || this._wasd.A.isDown;
    const right = this._cursors.right.isDown || this._wasd.D.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.W.isDown;
    const down  = this._cursors.down.isDown  || this._wasd.S.isDown;

    let ax = (right ? 1 : 0) - (left ? 1 : 0);
    let ay = (down  ? 1 : 0) - (up   ? 1 : 0);

    if (ax === 0 && ay === 0) {
      ax = this._touchAxis.x;
      ay = this._touchAxis.y;
    } else if (ax !== 0 && ay !== 0) {
      ax *= 0.707; ay *= 0.707;
    }

    const accel = this._speed * 10;
    this.setAcceleration(ax * accel, ay * accel);

    if (this._aimAngle !== null) {
      this.rotation = this._aimAngle + Math.PI / 2;
    } else if (this.body.velocity.lengthSq() > 10) {
      const targetRotation = this.body.velocity.angle() + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
    }
  }

  _autoFire(time) {
    if (!this._onFire || time - this._lastFired < this._stingerRate) return;
    // When aiming: fire from head toward cursor. Otherwise fire from tail (backward).
    const fireAngle = this._aimAngle !== null
      ? this._aimAngle
      : this.rotation + Math.PI / 2;
    const fired = this._onFire(this.x, this.y, this._stingerRange, this._stingerDamage, this._stingerSpeed, fireAngle);
    if (fired) this._lastFired = time;
  }

  // Returns true if bee died
  takeDamage(amount) {
    if (!this.alive || this.isDashing) return false;
    const actual = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - actual);
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
