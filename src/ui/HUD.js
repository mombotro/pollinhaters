import Phaser from 'phaser';
import { TIMER } from '../constants.js';

export default class HUD {
  constructor(scene, resources, hive, player, wind) {
    this._resources = resources;
    this._hive = hive;
    this._player = player;
    this._wind = wind;

    const s = { fontSize: '18px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };

    this._honeyText   = scene.add.text(16,  16, '', s).setScrollFactor(0).setDepth(100);
    this._sapText     = scene.add.text(16,  42, '', s).setScrollFactor(0).setDepth(100);
    this._beeHpText   = scene.add.text(16,  68, '', s).setScrollFactor(0).setDepth(100);
    this._hiveHpText  = scene.add.text(16,  94, '', s).setScrollFactor(0).setDepth(100);
    this._waveText    = scene.add.text(16, 120, '', s).setScrollFactor(0).setDepth(100);
    this._workerText = scene.add.text(16, 146, '', s).setScrollFactor(0).setDepth(100);
    this._xpText      = scene.add.text(16, 172, '', s).setScrollFactor(0).setDepth(100);
    this._timerText   = scene.add.text(640, 16, '', { ...s, fontSize: '24px' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    this._windText    = scene.add.text(640, 42, '', s)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  update(elapsed, waveNumber, workerCount, level, currentXp, reqXp) {
    const remaining = Math.max(0, TIMER.RUN_DURATION - elapsed);
    const mins = Math.floor(remaining / 60000);
    const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

    this._honeyText.setText(`Honey: ${Math.floor(this._resources.getHoney())}/${this._resources.getHoneyStorage()}`);
    this._sapText.setText(`Sap: ${this._resources.getSapCarried('player')} / ${this._player._sapCapacity}`);
    const armorStr = this._player.armor > 0 ? `  Armor: ${this._player.armor}` : '';
    this._beeHpText.setText(`Bee HP: ${this._player.hp} / ${this._player.maxHp}${armorStr}`);
    this._hiveHpText.setText(`Hive HP: ${this._hive.hp} / ${this._hive.maxHp}`);
    this._waveText.setText(`Wave: ${waveNumber}`);
    this._timerText.setText(`${mins}:${secs}`);
    this._workerText.setText(`Workers: ${workerCount}`);
    this._xpText.setText(`Level: ${level}  XP: ${Math.floor(currentXp)}/${Math.floor(reqXp)}`);

    if (this._wind) {
      const vec = this._wind.getVector();
      const angle = Math.atan2(vec.y, vec.x) * (180 / Math.PI);
      const speed = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
      let dir = '→';
      if (angle < -135 || angle > 135) dir = '←';
      else if (angle < -45 && angle >= -135) dir = '↑';
      else if (angle > 45 && angle <= 135) dir = '↓';
      
      if (angle > -135 && angle < -45 && vec.x > 10) dir = '↗';
      if (angle > -135 && angle < -45 && vec.x < -10) dir = '↖';
      if (angle > 45 && angle < 135 && vec.x > 10) dir = '↘';
      if (angle > 45 && angle < 135 && vec.x < -10) dir = '↙';

      this._windText.setText(`Wind: ${dir} (${Math.floor(speed)})`);
    }
  }
}
