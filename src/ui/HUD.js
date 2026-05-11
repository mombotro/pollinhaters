import Phaser from 'phaser';
import { TIMER } from '../constants.js';

export default class HUD {
  constructor(scene, resources, hive, player, wind) {
    this._resources = resources;
    this._hive = hive;
    this._player = player;
    this._wind = wind;
    this._cache = {};

    const s = { fontSize: '18px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };

    this._honeyText   = scene.add.text(16,  16, '', s).setScrollFactor(0).setDepth(100);
    this._sapText     = scene.add.text(16,  42, '', s).setScrollFactor(0).setDepth(100);
    this._beeHpText   = scene.add.text(16,  68, '', s).setScrollFactor(0).setDepth(100);
    this._hiveHpText  = scene.add.text(16,  94, '', s).setScrollFactor(0).setDepth(100);
    this._waveText    = scene.add.text(16, 120, '', s).setScrollFactor(0).setDepth(100);
    this._workerText  = scene.add.text(16, 146, '', s).setScrollFactor(0).setDepth(100);
    this._xpText      = scene.add.text(16, 172, '', s).setScrollFactor(0).setDepth(100);
    this._waspHoneyText = scene.add.text(16, 198, '', s).setScrollFactor(0).setDepth(100);
    this._timerText   = scene.add.text(640, 16, '', { ...s, fontSize: '24px' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100)
      .setVisible(!scene._playground);
    this._windText    = scene.add.text(640, 42, '', s)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  _set(obj, key, value) {
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    obj.setText(value);
  }

  update(elapsed, waveNumber, workerCount, level, currentXp, reqXp, waspHoney, runDuration = TIMER.RUN_DURATION) {
    const remaining = Math.max(0, runDuration - elapsed);
    const mins = Math.floor(remaining / 60000);
    const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

    const honey = Math.floor(this._resources.getHoney());
    const honeyStorage = this._resources.getHoneyStorage();
    const sap = this._resources.getSapCarried('player');
    const armorStr = this._player.armor > 0 ? `  Armor: ${this._player.armor}` : '';

    this._set(this._honeyText,  'h',  `Honey: ${honey}/${honeyStorage}`);
    this._set(this._sapText,    's',  `Sap: ${sap} / ${this._player._sapCapacity}`);
    this._set(this._beeHpText,  'b',  `Bee HP: ${this._player.hp} / ${this._player.maxHp}${armorStr}`);
    this._set(this._hiveHpText, 'hv', `Hive HP: ${this._hive.hp} / ${this._hive.maxHp}`);
    this._set(this._waveText,   'w',  `Wave: ${waveNumber}`);
    this._set(this._timerText,  't',  `${mins}:${secs}`);
    this._set(this._workerText, 'wk', `Workers: ${workerCount}`);
    this._set(this._xpText,       'x',  `Level: ${level}  XP: ${Math.floor(currentXp)}/${Math.floor(reqXp)}`);
    this._set(this._waspHoneyText,'wh', `Enemy honey: ${Math.floor(waspHoney ?? 0)}`);

    if (this._wind) {
      const vec = this._wind.getVector();
      const angle = Math.atan2(vec.y, vec.x) * (180 / Math.PI);
      const speed = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
      const spd = Math.floor(speed);
      let dir = '→';
      if (angle < -135 || angle > 135) dir = '←';
      else if (angle < -45) dir = '↑';
      else if (angle > 45 && angle <= 135) dir = '↓';
      this._set(this._windText, 'wd', `Wind: ${dir} (${spd})`);
    }
  }
}
