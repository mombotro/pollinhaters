import { WIND } from '../constants.js';

export default class WindSystem {
  constructor() {
    this._angle = 0;
    this._strength = 0;
    this._targetAngle = 0;
    this._targetStrength = 0;
    this._nextShiftAt = WIND.SHIFT_INTERVAL;
  }

  update(time) {
    if (time >= this._nextShiftAt) {
      this._targetAngle = Math.random() * Math.PI * 2;
      this._targetStrength = Math.random() * WIND.MAX_STRENGTH;
      this._nextShiftAt = time + WIND.SHIFT_INTERVAL;
    }
    this._angle    += (this._targetAngle    - this._angle)    * WIND.LERP_RATE;
    this._strength += (this._targetStrength - this._strength) * WIND.LERP_RATE;
  }

  // Returns wind velocity vector in px/s. Add directly to entity body.velocity.
  getVector() {
    return {
      x: Math.cos(this._angle) * this._strength,
      y: Math.sin(this._angle) * this._strength,
    };
  }

  getCurrentStrength() {
    return this._strength;
  }
}
