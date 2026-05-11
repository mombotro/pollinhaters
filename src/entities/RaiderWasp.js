import Phaser from 'phaser';
import { WASP, TOWER } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class RaiderWasp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, hive, target = null, waspHive = null) {
    super(scene, x, y, 'wasp');
    this.setScale(1.0).setTint(0xff8866);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.waspType = 'raider';
    this.hp = WASP.HP;
    this._hive = hive;
    this._target = target || hive;
    this._waspHive = waspHive;
    this.slowedUntil = 0;
    this.isRetreating = false;
    this.retreatTarget = null;
    this.honeyCarried = 0;
    this.lastHit = 0;
    this.setDrag(800, 800);
  }

  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }

  retreat() {
    this.isRetreating = true;
    if ((this.honeyCarried > 0 || this.poisonCarried) && this._waspHive) {
      this.retreatTarget = { x: this._waspHive.x, y: this._waspHive.y };
      return;
    }
    if (this._waspHive) {
      this.retreatTarget = { x: this._waspHive.x, y: this._waspHive.y };
    } else {
      const angle = Phaser.Math.Angle.Between(this._hive.x, this._hive.y, this.x, this.y);
      this.retreatTarget = {
        x: this.x + Math.cos(angle) * 2000,
        y: this.y + Math.sin(angle) * 2000,
      };
    }
  }

  update(time, windVec) {
    if (this._flankWaypoint) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (dist <= 50) {
        this._flankWaypoint = null;
      } else {
        const speed = WASP.RAIDER_SPEED * (this._speedMult ?? 1);
        this._movePhysics(this._flankWaypoint.x, this._flankWaypoint.y, speed);
        return;
      }
    }

    if (this._poisonTarget && this._poisonTarget.active && !this.isRetreating) {
      const baseSpeed = WASP.RAIDER_SPEED * (this._speedMult ?? 1);
      const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
      this._movePhysics(this._poisonTarget.x, this._poisonTarget.y, speed);
      return;
    }

    if (this.isRetreating && this.retreatTarget) {
      const baseSpeed = WASP.RAIDER_SPEED * (this._speedMult ?? 1);
      const speed = time < this.slowedUntil
        ? baseSpeed * TOWER.RESIN_TRAP_SLOW
        : baseSpeed;
      this._movePhysics(this.retreatTarget.x, this.retreatTarget.y, speed);
      this._separate();
      if (Phaser.Math.Distance.Between(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y) < 50) {
        if (this.honeyCarried > 0 && this.scene.waspHiveSystem) {
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0xffaa00, 10);
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0xff4400, 6);
          SoundSynth.play('deposit');
          this.scene.waspHiveSystem.onHoneyStolen(this.honeyCarried);
        } else if (this.poisonCarried && this.scene.waspHiveSystem) {
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0x44ff44, 8);
          SoundSynth.play('hive-hit');
          this.scene.waspHiveSystem.onPoisonDelivered(TOWER.POISON_HONEY_DAMAGE);
        }
        this.destroy();
      }
      return;
    }

    // If assigned target (guard post) died, fall back to hive
    if (!this._target || !this._target.active) this._target = this._hive;
    if (!this._target || !this._target.active) return;

    const baseSpeed = WASP.RAIDER_SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil
      ? baseSpeed * TOWER.RESIN_TRAP_SLOW
      : baseSpeed;
    this._movePhysics(this._target.x, this._target.y, speed);
    this._separate();
  }

  _movePhysics(tx, ty, speed) {
    this.setMaxVelocity(speed, speed);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (dist > 5) {
      const ax = (tx - this.x) / dist;
      const ay = (ty - this.y) / dist;
      this.setAcceleration(ax * speed * 10, ay * speed * 10);
    } else {
      this.setAcceleration(0, 0);
    }
    
    if (this.body.velocity.lengthSq() > 10) {
      const targetRotation = this.body.velocity.angle() + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
    }
  }

  _separate() {
    if (!this.scene?.wasps) return;
    const RADIUS = 64, FORCE = 400;
    let sx = 0, sy = 0;
    this.scene.wasps.getChildren().forEach(other => {
      if (!other.active || other === this) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < RADIUS) {
        const s = ((RADIUS - dist) / RADIUS) * FORCE;
        sx += (dx / dist) * s;
        sy += (dy / dist) * s;
      }
    });
    if (sx !== 0 || sy !== 0) {
      this.body.acceleration.x += sx;
      this.body.acceleration.y += sy;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
