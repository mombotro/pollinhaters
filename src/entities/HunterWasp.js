import Phaser from 'phaser';
import { WASP, TOWER } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class HunterWasp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'wasp');
    this.setScale(1.0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.waspType = 'hunter';
    this.hp = WASP.HP;
    this._target = null;
    this.lastHit = 0;
    this.slowedUntil = 0;
    this.honeyCarried = 0;
    this.setDrag(800, 800);
  }

  setTarget(target) { this._target = target; }

  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }

  update(time, windVec) {
    if (this._honeyEmitter) this._honeyEmitter.setPosition(this.x, this.y);
    if (this._flankWaypoint) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (dist <= 50) {
        this._flankWaypoint = null;
      } else {
        const speed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
        this.setMaxVelocity(speed, speed);
        const ax = (this._flankWaypoint.x - this.x) / dist;
        const ay = (this._flankWaypoint.y - this.y) / dist;
        this.setAcceleration(ax * speed * 10, ay * speed * 10);
        if (this.body.velocity.lengthSq() > 10) {
          this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this.body.velocity.angle() + Math.PI / 2, 0.15);
        }
        this._separate();
        return;
      }
    }

    if (this._poisonTarget && this._poisonTarget.active && !this.isRetreating) {
      const baseSpeed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
      const speed = time < this.slowedUntil ? baseSpeed * TOWER.RESIN_TRAP_SLOW : baseSpeed;
      this.setMaxVelocity(speed, speed);
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this._poisonTarget.x, this._poisonTarget.y);
      if (dist > 5) {
        const ax = (this._poisonTarget.x - this.x) / dist;
        const ay = (this._poisonTarget.y - this.y) / dist;
        this.setAcceleration(ax * speed * 10, ay * speed * 10);
      } else {
        this.setAcceleration(0, 0);
      }
      if (this.body.velocity.lengthSq() > 10) {
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this.body.velocity.angle() + Math.PI / 2, 0.15);
      }
      this._separate();
      return;
    }

    if (this.isRetreating && this.retreatTarget) {
      const baseSpeed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
      const speed = time < this.slowedUntil
        ? baseSpeed * TOWER.RESIN_TRAP_SLOW
        : baseSpeed;
      this.setMaxVelocity(speed, speed);
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.retreatTarget.x, this.retreatTarget.y);
      if (dist > 5) {
        const ax = (this.retreatTarget.x - this.x) / dist;
        const ay = (this.retreatTarget.y - this.y) / dist;
        this.setAcceleration(ax * speed * 10, ay * speed * 10);
      } else {
        this.setAcceleration(0, 0);
      }
      if (this.honeyCarried > 0) {
        if (dist < 50) {
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0xffaa00, 10);
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0xff4400, 6);
          SoundSynth.play('deposit');
          this.scene.waspHiveSystem.onHoneyStolen(this.honeyCarried);
          this.destroy();
        }
      } else if (this.poisonCarried) {
        if (dist < 50) {
          this.scene._burst?.(this.retreatTarget.x, this.retreatTarget.y, 0x44ff44, 8);
          SoundSynth.play('hive-hit');
          this.scene.waspHiveSystem.onPoisonDelivered(TOWER.POISON_HONEY_DAMAGE);
          this.destroy();
        }
      } else if (this.x < -200 || this.x > 3000 || this.y < -200 || this.y > 2000) {
        this.destroy();
      }
      this._separate();
      return;
    }

    let target = this._target;
    
    // Switch to player if player is alive and we aren't targeting them
    if (this.scene.player && this.scene.player.alive && target !== this.scene.player) {
      target = this.scene.player;
      this._target = target;
    }

    // If target is dead/invalid, find a fallback
    if (!target || !target.active || target.alive === false) {
      const workers = this.scene.workers ? this.scene.workers.getChildren().filter(w => w.active && w.alive) : [];
      const guardPosts = this.scene._towerList ? this.scene._towerList.filter(t => t.towerType === 'guard' && t.active && t.hp > 0) : [];
      const potentialTargets = [...workers, ...guardPosts];
      if (this.scene.hive && this.scene.hive.active) potentialTargets.push(this.scene.hive);

      let nearest = null, nearestDist = Infinity;
      potentialTargets.forEach(t => {
        const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
        if (d < nearestDist) { nearest = t; nearestDist = d; }
      });
      target = nearest;
      this._target = target;
    }

    if (!target || !target.active) {
      // Counter wind so wasp doesn't drift off screen if absolutely no targets exist
      this.setAcceleration(0, 0);
      if (windVec) this.body.setVelocity(-windVec.x, -windVec.y);
      return;
    }
    const baseSpeed = WASP.HUNTER_SPEED * (this._speedMult ?? 1);
    const speed = time < this.slowedUntil
      ? baseSpeed * TOWER.RESIN_TRAP_SLOW
      : baseSpeed;

    this.setMaxVelocity(speed, speed);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist > 5) {
      const ax = (target.x - this.x) / dist;
      const ay = (target.y - this.y) / dist;
      this.setAcceleration(ax * speed * 10, ay * speed * 10);
    } else {
      this.setAcceleration(0, 0);
    }

    if (this.body.velocity.lengthSq() > 10) {
      const targetRotation = this.body.velocity.angle() + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
    }
    this._separate();
  }

  _separate() {
    if (!this.scene?.wasps) return;
    const RADIUS = 72, FORCE = 1200;
    let sx = 0, sy = 0;
    this.scene.wasps.getChildren().forEach(other => {
      if (!other.active || other === this) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        sx += (Math.random() - 0.5) * FORCE;
        sy += (Math.random() - 0.5) * FORCE;
      } else if (dist < RADIUS) {
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

  // Returns true if destroyed
  takeDamage(amount) {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  _startHoneyGlow() {
    if (this._honeyEmitter) return;
    this._honeyEmitter = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 30, max: 60 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 350,
      frequency: 80,
      tint: 0xffdd00,
      quantity: 1,
    });
    this.once('destroy', () => { if (this._honeyEmitter?.scene) this._honeyEmitter.destroy(); });
  }

  retreat() {
    this.isRetreating = true;
    if ((this.honeyCarried > 0 || this.poisonCarried) && this.scene.waspHiveSystem) {
      const wh = this.scene.waspHiveSystem.hive;
      this.retreatTarget = { x: wh.x, y: wh.y };
    } else {
      const angle = Phaser.Math.Angle.Between(this.scene.hive.x, this.scene.hive.y, this.x, this.y);
      this.retreatTarget = {
        x: this.x + Math.cos(angle) * 2000,
        y: this.y + Math.sin(angle) * 2000,
      };
    }
  }
}
