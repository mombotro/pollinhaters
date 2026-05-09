import Phaser from 'phaser';
import { FLOWER, FLOWER_TYPES } from '../constants.js';

const STATE = { YOUNG: 'young', MATURE: 'mature', OLD: 'old', DEAD: 'dead' };

export default class Flower extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'COMMON') {
    super(scene, x, y, 'flower');
    scene.add.existing(this);
    // Static body assigned by staticGroup.add() in GameScene — do NOT call physics.add.existing here

    this._type     = type;
    this._typeDef  = FLOWER_TYPES[type];
    this._state    = STATE.YOUNG;
    this._matureAt = null;
    this._oldAt    = null;
    this.onDead    = null;  // GameScene sets this after construction

    this.sapRemaining    = this._typeDef.sapAmount;
    this.pollenCollected = false;
    this.claimedBy       = null;

    this._applyYoungVisuals();
  }

  get flowerType()  { return this._type; }
  get lifecycle() { return this._state; }

  update(time) {
    switch (this._state) {
      case STATE.YOUNG:
        if (this._matureAt === null) this._matureAt = time + FLOWER.YOUNG_DURATION;
        if (time >= this._matureAt) this._enterMature();
        break;

      case STATE.MATURE:
        if (this.sapRemaining <= 0 || time >= this._matureAt + this._typeDef.lifespan) {
          this._enterOld(time);
        }
        break;

      case STATE.OLD:
        this.setAlpha(0.3 + 0.7 * (Math.sin(time / 300) * 0.5 + 0.5));
        if (time >= this._oldAt + FLOWER.OLD_DURATION) this._enterDead();
        break;

      case STATE.DEAD:
        break;
    }
  }

  // Returns true if pollen was freshly collected (triggers pollination spawn in GameScene)
  collectPollen() {
    if (this._state === STATE.YOUNG) return false;
    if (this.pollenCollected) return false;
    this.pollenCollected = true;
    return true;
  }

  // Called by nearby butterflies each frame to speed growth and slow death.
  receiveButterflyBoost(delta) {
    if (this._state === STATE.YOUNG && this._matureAt !== null) {
      this._matureAt -= delta;           // grow faster
    } else if (this._state === STATE.OLD) {
      this._oldAt += delta * 0.5;        // die slower (timer advances at half rate)
    }
  }

  // Returns amount of sap actually taken (0 if YOUNG)
  collectSap(amount) {
    if (this._state === STATE.YOUNG) return 0;
    const taken = Math.min(this.sapRemaining, amount);
    this.sapRemaining -= taken;
    return taken;
  }

  _applyYoungVisuals() {
    this.setScale(0.6);
    this.setAlpha(0.5);
    if (this._typeDef.tint) this.setTint(this._typeDef.tint);
  }

  _enterMature() {
    this._state = STATE.MATURE;
    this.setScale(1);
    this.setAlpha(1);
    if (this._typeDef.tint) this.setTint(this._typeDef.tint);
    else this.clearTint();
  }

  _enterOld(time) {
    this._state = STATE.OLD;
    this._oldAt = time;
    this.setTint(0x888888);
  }

  _enterDead() {
    this._state = STATE.DEAD;
    if (this.claimedBy) { this.claimedBy._target = null; this.claimedBy = null; }
    if (this.onDead) this.onDead();
    this.destroy();
  }
}
