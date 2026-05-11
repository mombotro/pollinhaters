import Phaser from 'phaser';
import { ARCHER_WASP, TOWER } from '../constants.js';
import Stinger from './Stinger.js';

export default class ArcherWasp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'wasp');
    this.setScale(1.0).setTint(0xaa44ff);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.waspType = 'archer';
    this.hp = ARCHER_WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
    this.honeyCarried = 0;
    this._lastFired = 0;
    this.setDrag(800, 800);
  }

  setTarget(target) { this._target = target; }

  update(time, windVec) {
    let target = this._target;
    if (!target || !target.active || target.alive === false) {
      if (this.scene.player?.alive) { target = this.scene.player; this._target = target; }
      else { this.setAcceleration(0, 0); return; }
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const baseSpeed = ARCHER_WASP.SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    if (dist < ARCHER_WASP.MIN_RANGE) {
      // Too close — back away, face forward
      this.setMaxVelocity(speed, speed);
      const ax = (this.x - target.x) / dist;
      const ay = (this.y - target.y) / dist;
      this.setAcceleration(ax * speed * 10, ay * speed * 10);
      if (this.body.velocity.lengthSq() > 10) {
        this.rotation = Phaser.Math.Angle.RotateTo(
          this.rotation, this.body.velocity.angle() + Math.PI / 2, 0.12,
        );
      }
    } else if (dist > ARCHER_WASP.ATTACK_RANGE) {
      // Approach — face toward target
      this.setMaxVelocity(speed, speed);
      const ax = (target.x - this.x) / dist;
      const ay = (target.y - this.y) / dist;
      this.setAcceleration(ax * speed * 10, ay * speed * 10);
      if (this.body.velocity.lengthSq() > 10) {
        this.rotation = Phaser.Math.Angle.RotateTo(
          this.rotation, this.body.velocity.angle() + Math.PI / 2, 0.12,
        );
      }
    } else {
      // In range — stop and rotate backwards (tail toward target)
      this.setAcceleration(0, 0);
      // backwardRot: sprite front faces away, so tail (rotation+PI/2) faces target
      const backwardRot = angleToTarget - Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, backwardRot, 0.06);

      const diff = Phaser.Math.Angle.Wrap(this.rotation - backwardRot);
      if (Math.abs(diff) < 0.2 && time - this._lastFired >= ARCHER_WASP.FIRE_RATE) {
        const tailAngle = this.rotation + Math.PI / 2;
        const spawnX = this.x + Math.cos(tailAngle) * 12;
        const spawnY = this.y + Math.sin(tailAngle) * 12;
        let s = this.scene.enemyStingers.getFirstDead(false);
        if (!s) { s = new Stinger(this.scene, 0, 0); this.scene.enemyStingers.add(s); }
        s.fire(spawnX, spawnY, ARCHER_WASP.DAMAGE, ARCHER_WASP.ATTACK_RANGE + 60,
               ARCHER_WASP.STINGER_SPEED, target.x, target.y);
        this._lastFired = time;
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.setTint(0xaa44ff); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }
}
