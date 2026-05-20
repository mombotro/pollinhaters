import Phaser from 'phaser';
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP, BUTTERFLY, SPIDER, WEB, WIND, BREAKABLE, SOLDIER, PICKUP, NECTAR_FOUNTAIN, DEPTH, pickFlowerType } from '../constants.js';
import MetaSave from '../systems/MetaSave.js';
import Flower from '../entities/Flower.js';
import Hive from '../entities/Hive.js';
import ResourceManager from '../systems/ResourceManager.js';
import PollinationSystem from '../systems/PollinationSystem.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import PlayerBee from '../entities/PlayerBee.js';
import Stinger from '../entities/Stinger.js';
import WorkerBee from '../entities/WorkerBee.js';
import WaveManager from '../systems/WaveManager.js';
import WaspHiveSystem from '../systems/WaspHiveSystem.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';
import ResinTrap from '../towers/ResinTrap.js';
import GuardPost from '../towers/GuardPost.js';
import Pickup from '../entities/Pickup.js';
import Breakable from '../entities/Breakable.js';
import HUD from '../ui/HUD.js';
import TouchControls from '../ui/TouchControls.js';
import BuildMenu from '../ui/BuildMenu.js';
import LevelUpMenu from '../ui/LevelUpMenu.js';
import WindSystem from '../systems/WindSystem.js';
import Butterfly from '../entities/Butterfly.js';
import Spider from '../entities/Spider.js';
import WebTrap from '../entities/WebTrap.js';
import SoldierBee from '../entities/SoldierBee.js';
import PoisonHoney from '../towers/PoisonHoney.js';
import ArcherWasp from '../entities/ArcherWasp.js';
import NectarFountain from '../entities/NectarFountain.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data = {}) {
    this.hiveX = data.hiveX ?? 1920;
    this.hiveY = data.hiveY ?? 1080;
    this._ended = false;
    this._gameTime = 0;
    this._playTime = 0;
    this.xp = 0;
    this.xpFloor = 0;
    this._xpIncrement = XP.BASE_REQ;
    this.level = 1;
    this.reqXp = XP.BASE_REQ;
    this._playground = data.playground ?? false;
    this._paused = false;
    this._pauseObjs = null;
    this._pauseCtrlObjs = null;
  }

  create() {
    this.add.rectangle(WORLD.WIDTH / 2, WORLD.HEIGHT / 2, WORLD.WIDTH, WORLD.HEIGHT, 0x2d5a1b);
    this.cameras.main.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    const BT = 56;
    const borderGfx = this.add.graphics().setDepth(DEPTH.BORDER);
    borderGfx.fillStyle(0x142d0a, 1);
    borderGfx.fillRect(0, 0, WORLD.WIDTH, BT);
    borderGfx.fillRect(0, WORLD.HEIGHT - BT, WORLD.WIDTH, BT);
    borderGfx.fillRect(0, 0, BT, WORLD.HEIGHT);
    borderGfx.fillRect(WORLD.WIDTH - BT, 0, BT, WORLD.HEIGHT);

    this._decoList = [];
    for (let i = 0; i < 400; i++) {
      const x = Phaser.Math.Between(0, WORLD.WIDTH);
      const y = Phaser.Math.Between(0, WORLD.HEIGHT);
      const frame = Phaser.Math.Between(0, 6);
      const scale = Phaser.Math.FloatBetween(0.1, 0.2);
      const img = this.add.image(x, y, 'grass-deco', frame)
        .setScale(scale)
        .setAlpha(0.9)
        .setFlipX(Math.random() < 0.5)
        .setCrop(4, 4, 392, 392)
        .setDepth(DEPTH.ENVIRONMENT);
      this._decoList.push(img);
    }
    this.physics.world.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    this.flowers = this.physics.add.staticGroup();
    this.wasps = this.physics.add.group();
    this.stingers = this.physics.add.group();
    this.workers = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.breakables = this.physics.add.group();
    this._towerList = [];
    this.soldiers = this.physics.add.group();
    this.enemyStingers = this.physics.add.group();
    this.butterflies = this.physics.add.group();
    this.spiders = this.physics.add.group();
    this._webList = [];
    this.wind = new WindSystem();

    this._spawnInitialFlowers();

    this.hive = new Hive(this, this.hiveX, this.hiveY);

    this.resources = new ResourceManager({
      honeyStorage: HIVE.HONEY_STORAGE,
      sapConversionRate: HIVE.SAP_CONVERSION_RATE,
    });

    this.upgrades = new UpgradeManager();

    this.pollination = new PollinationSystem({
      spawnDelay: FLOWER.SPAWN_DELAY,
      radius: FLOWER.POLLINATION_RADIUS,
      onSpawn: ({ x, y }) => {
        const fx = Phaser.Math.Clamp(x, 40, WORLD.WIDTH - 40);
        const fy = Phaser.Math.Clamp(y, 40, WORLD.HEIGHT - 40);
        this._spawnFlower(fx, fy);
      },
    });

    this._conversionTimer = this.time.addEvent({
      delay: HIVE.SAP_CONVERSION_INTERVAL,
      callback: () => this.resources.convertSap(1),
      loop: true,
    });

    this.time.addEvent({
      delay: BREAKABLE.SPAWN_DELAY,
      callback: () => this._spawnBreakable(),
      loop: true,
    });

    this.player = new PlayerBee(
      this,
      this.hiveX,
      this.hiveY + 80,
      (x, y, range, damage, speed, backwardAngle) => {
        // Only fire if an enemy is within range
        let hasTarget = false;
        for (const w of this.wasps.getChildren()) {
          if (w.active && Phaser.Math.Distance.Between(x, y, w.x, w.y) < range) { hasTarget = true; break; }
        }
        if (!hasTarget) {
          for (const b of this.breakables.getChildren()) {
            if (b.active && Phaser.Math.Distance.Between(x, y, b.x, b.y) < range) { hasTarget = true; break; }
          }
        }
        if (!hasTarget) {
          for (const wh of this.waspHiveSystem.hives) {
            if (wh.hp > 0 && Phaser.Math.Distance.Between(x, y, wh.x, wh.y) < range) { hasTarget = true; break; }
          }
        }
        if (!hasTarget) return false;

        const spawnX = x + Math.cos(backwardAngle) * 14;
        const spawnY = y + Math.sin(backwardAngle) * 14;
        let s = this.stingers.getFirstDead(false);
        if (!s) { s = new Stinger(this, 0, 0); this.stingers.add(s); }
        s.fire(spawnX, spawnY, damage, range, speed,
               spawnX + Math.cos(backwardAngle) * range,
               spawnY + Math.sin(backwardAngle) * range);
        return true;
      },
    );

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.physics.add.overlap(this.player, this.flowers, (player, flower) => {
      const space = this.player._sapCapacity - this.resources.getSapCarried('player');
      if (space > 0 && flower.sapRemaining > 0) {
        if (flower.collectPollen()) {
          this.pollination.pollinate({ x: flower.x, y: flower.y }, this.time.now);
        }
        const taken = flower.collectSap(space);
        if (taken > 0) {
          const now = this._gameTime;
          if (!flower._lastBurst || now - flower._lastBurst > 400) {
            this._burst(flower.x, flower.y, 0xffff88, 5);
            SoundSynth.play('pickup');
            flower._lastBurst = now;
          }
        }
        this.resources.addSap('player', taken, this.player._sapCapacity);
      } else if (flower.sapRemaining <= 0) {
        if (flower.collectPollen()) {
          this.pollination.pollinate({ x: flower.x, y: flower.y }, this.time.now);
        }
      }
    });

    this.physics.add.overlap(this.player, this.hive, () => {
      if (this.resources.getSapCarried('player') > 0) {
        this._burst(this.hive.x, this.hive.y, 0xffd700, 10);
        SoundSynth.play('deposit');
        this.resources.depositSap('player');
      }
    });

    this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
      if (pickup.onCollect(player, this)) {
        this._burst(pickup.x, pickup.y, 0xffff88, 6);
      }
    });

    this.physics.add.overlap(this.stingers, this.breakables, (stinger, breakable) => {
      stinger.release();
      breakable.takeDamage(stinger.damage);
    });

    this.physics.add.collider(this.wasps, this.wasps);

    this.physics.add.overlap(this.player, this.enemyStingers, (player, stinger) => {
      stinger.release();
      if (!player.alive) return;
      if (player.takeDamage(stinger.damage)) this._onPlayerDeath();
    });

    this.physics.add.overlap(this.workers, this.enemyStingers, (worker, stinger) => {
      if (!worker.alive) return;
      stinger.release();
      worker.takeDamage(stinger.damage);
    });

    this.physics.add.overlap(this.soldiers, this.enemyStingers, (soldier, stinger) => {
      if (!soldier.alive) return;
      stinger.release();
      soldier.takeDamage(stinger.damage);
    });

    // Apply meta-progression upgrades from save
    const _metaSave = MetaSave.load();
    const _u = _metaSave.upgrades;

    this._runDuration = TIMER.RUN_DURATION
      - (_u.QUICK_RUN_META ?? 0) * 60000
      + (_u.LONG_RUN_META  ?? 0) * 300000;
    this.waveManager = new WaveManager({
      firstWaveDelay: WAVE.FIRST_WAVE_DELAY,
      waveInterval: WAVE.WAVE_INTERVAL,
      baseCount: WAVE.BASE_COUNT + (_u.HARD_MODE_META ?? 0) * 2,
      countIncrement: WAVE.COUNT_INCREMENT,
    });

    this.waspHiveSystem = new WaspHiveSystem({
      scene: this,
      playerHiveX: this.hiveX,
      playerHiveY: this.hiveY,
      extraHives: _u.EXTRA_HIVES_META ?? 0,
      onDestroyed: () => this._endGame(true, true),
    });

    this._metaSpeedBonus = (_u.BEE_SPEED_META ?? 0) * 20;
    if (this._metaSpeedBonus)  this.player._speed += this._metaSpeedBonus;
    if (_u.BEE_HP_META)       { this.player.maxHp += _u.BEE_HP_META * 2; this.player.hp = this.player.maxHp; }
    if (_u.HIVE_HP_META)      { this.hive.maxHp   += _u.HIVE_HP_META * 5; this.hive.hp  = this.hive.maxHp; }
    if (_u.HIVE_STORAGE_META) this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + _u.HIVE_STORAGE_META * 50);

    if (_u.START_WORKER) {
      const _w = new WorkerBee(this, this.hiveX, this.hiveY);
      _w.init(this.hive, this.flowers);
      this.workers.add(_w);
    }
    this._metaSoldierDmg = _u.SOLDIER_DMG_META ?? 0;

    if (_u.START_ARMOR)  this.player.armor = 1;
    if (_u.START_HONEY)  { this.resources.addPendingSap(30); this.resources.convertSap(30); }
    if (_u.START_GUARD)  {
      const _post = new GuardPost(this, this.hiveX + 80, this.hiveY);
      this._towerList.push(_post);
    }
    if (_u.START_SOLDIER) this._recruitSoldier(true);

    this.physics.add.overlap(this.stingers, this.wasps, (stinger, wasp) => {
      if (!stinger.active || !wasp.active) return;
      stinger.release();
      SoundSynth.play('hit');
      if (wasp.takeDamage(stinger.damage)) {
        this._dropPickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp');
        if (Math.random() < 0.10) this._dropPickup(wasp.x, wasp.y, 'health');
      }
    });

    this.waspHiveSystem.hives.forEach(wh => {
      this.physics.add.overlap(wh, this.stingers, (waspHive, stinger) => {
        if (!stinger.active) return;
        stinger.release();
        this.waspHiveSystem.onHiveAttacked(this._gameTime, waspHive);
        if (waspHive.takeDamage(stinger.damage)) {
          this.waspHiveSystem.onHiveDestroyed();
        }
      });
    });

    this.physics.add.overlap(this.player, this.waspHiveSystem.hives, (player, waspHive) => {
      if (!player.isDashing) return;
      const now = this._gameTime;
      if (now - (waspHive._lastDashHit || 0) < 500) return;
      waspHive._lastDashHit = now;
      this.waspHiveSystem.onHiveAttacked(now);
      if (waspHive.takeDamage(1)) {
        this._endGame(true, true);
      }
    });

    this.physics.add.overlap(this.player, this.breakables, (player, breakable) => {
      if (!player.isDashing) return;
      const now = this._gameTime;
      if (now - (breakable._lastDashHit || 0) < 500) return;
      breakable._lastDashHit = now;
      breakable.takeDamage(1);
    });

    this.physics.add.overlap(this.wasps, this.player, (a, b) => {
      const wasp = a.waspType ? a : b;
      const bee  = a.waspType ? b : a;
      if (!bee.alive) return;
      
      const now = this._gameTime;

      // Dash attack logic
      if (bee.isDashing) {
        if (now - (wasp.lastDashedHit || 0) < 500) return;
        wasp.lastDashedHit = now;
        if (wasp.takeDamage(1)) {
          this._dropPickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp');
          if (Math.random() < 0.10) this._dropPickup(wasp.x, wasp.y, 'health');
        }
        return;
      }

      if (wasp.waspType !== 'hunter') return;
      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      wasp.lastHit = now;

      const sap = this.resources.getSapCarried('player');
      if (sap > 0) {
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
      } else {
        if (bee.takeDamage(WASP.DAMAGE)) this._onPlayerDeath();
      }
    });

    this.physics.add.overlap(this.wasps, this.hive, (a, b) => {
      const wasp = a.waspType ? a : b;
      const hive = a.waspType ? b : a;
      if (wasp.isRetreating) return;
      
      const now = this._gameTime;
      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      wasp.lastHit = now;

      if (this.resources.getHoney() > 0) {
        this._burst(hive.x, hive.y, 0xff8800, 8);
        this._burst(hive.x, hive.y, 0x6b3a1f, 5);
        SoundSynth.play('hive-hit');
        this.resources.stealHoney(WASP.HONEY_STEAL);
        wasp.honeyCarried = WASP.HONEY_STEAL;
        wasp._startHoneyGlow?.();
        if (typeof wasp.retreat === 'function') wasp.retreat();
      } else {
        this._burst(hive.x, hive.y, 0x6b3a1f, 6);
        SoundSynth.play('hive-hit');
        if (hive.takeDamage(WASP.DAMAGE)) this._endGame(false);
      }
    });

    this._bKey   = this.input.keyboard.addKey('B');
    this._hKey   = this.input.keyboard.addKey('H');
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._gpStartWasDown = false;
    this._paused = false;
    this._placing = null;
    this._ghost = null;

    this.buildMenu = new BuildMenu(this, (key) => {
      if (this.player) this.player._gpAWasDown = true;
      if (key === 'recruit-worker') {
        this._recruitWorker();
      } else if (key === 'recruit-soldier') {
        this._recruitSoldier();
      } else {
        this._enterPlacementMode(key);
      }
    }, () => this.resources.getHoney());

    this.levelUpMenu = new LevelUpMenu(this, (key) => {
      if (this.upgrades.purchase(key)) {
        this._applyUpgrade(key);
      }
      if (this.player) this.player._gpAWasDown = true;
    });

    this.input.mouse.disableContextMenu();
    this.hud = new HUD(this, this.resources, this.hive, this.player, this.wind);
    this._touchControls = new TouchControls(this, this.player);
    this._spawnPassiveEntities();

    if (this._playground) this._createPlaygroundUI();
  }

  update(time, delta) {
    const _gp  = this.input.gamepad;
    const _pad = _gp?.total > 0 ? _gp.gamepads.find(p => p?.connected) : null;

    if (this.levelUpMenu.visible) {
      this.physics.world.pause();
      if (_pad) this.levelUpMenu.gpUpdate(_pad);
      return;
    }

    // Pause toggle — Escape or gamepad Start (button 9)
    const justEsc  = Phaser.Input.Keyboard.JustDown(this._escKey);
    const startDown = _pad?.buttons[9]?.pressed ?? false;
    if ((justEsc || (startDown && !this._gpStartWasDown)) && !this._ended) {
      if (this._paused) this._hidePause(); else this._showPause();
    }
    this._gpStartWasDown = startDown;

    if (this._paused) {
      if (_pad) this._updatePauseGamepad(_pad);
      return;
    }

    // Build menu — freeze game
    if (this.buildMenu.visible) {
      this.physics.world.pause();
      if (_pad) this.buildMenu.gpUpdate(_pad);
      if (Phaser.Input.Keyboard.JustDown(this._bKey)) this.buildMenu.hide();
      this._touchControls.update();
      return;
    }

    this.physics.world.resume();
    this.physics.world.timeScale = 1;
    this.time.timeScale = 1;

    // Placement mode — ghost follows player at player+70
    if (this._placing !== null) {
      if (this._ghost) {
        if (this.player) {
          this._ghost.setPosition(this.player.x + 70, this.player.y);
        }
        const gx = this._ghost.x, gy = this._ghost.y;
        const margin = 30;
        const valid = gx >= margin && gx <= WORLD.WIDTH - margin &&
                      gy >= margin && gy <= WORLD.HEIGHT - margin &&
                      Phaser.Math.Distance.Between(gx, gy, this.hiveX, this.hiveY) >= 100;
        this._ghost.setTint(valid ? 0xffffff : 0xff4444);
        this._ghost.setAlpha(valid ? 0.55 : 0.45);
      }
      if (_pad) {
        const aDown = _pad.buttons[0]?.pressed ?? false;
        if (aDown && !this._gpPlaceAWas) {
          if (this._ghost && this._isGhostValid()) this._placeTower(this._placing, this._ghost.x, this._ghost.y);
          this._cancelPlacement();
        }
        this._gpPlaceAWas = aDown;
        const bDown = _pad.buttons[1]?.pressed ?? false;
        if (bDown && !this._gpPlaceBWas) {
          this._cancelPlacement();
          if (this.player) this.player._gpBWasDown = true;
        }
        this._gpPlaceBWas = bDown;
      }
    }

    const scaledDelta = delta;
    this._gameTime += scaledDelta;
    this._playTime += scaledDelta;

    const workerCount = this.workers.getChildren().filter(w => w.alive).length;
    if (this.hud) this.hud.update(this._playTime, this.waveManager.getWaveNumber(), workerCount, this.level, this.xp, this.reqXp, this.waspHiveSystem.honeyStolen, this._runDuration);

    if (!this._playground && this._playTime >= this._runDuration) {
      this._endGame(true);
      return;
    }

    // Wind computed first so wasps can counter it when they have no target
    this.wind.update(this._gameTime);
    const windVec = this.wind.getVector();

    this.pollination.update(this._gameTime);
    this.flowers.getChildren().forEach(f => f.update(this._gameTime));
    if (this.player.alive) this.player.update(this._gameTime, scaledDelta);

    // Poison honey attraction
    this._towerList.forEach(tower => {
      if (tower.towerType !== 'poison-honey' || !tower.active) return;
      this.wasps.getChildren().forEach(wasp => {
        if (!wasp.active || wasp.isRetreating || wasp.poisonCarried) return;
        const dist = Phaser.Math.Distance.Between(wasp.x, wasp.y, tower.x, tower.y);
        if (dist < TOWER.POISON_HONEY_RADIUS) {
          wasp._poisonTarget = tower;
        } else if (wasp._poisonTarget === tower) {
          wasp._poisonTarget = null;
        }
        if (dist < 40) {
          tower.consume();
          wasp.poisonCarried = true;
          wasp._poisonTarget = null;
          if (typeof wasp.retreat === 'function') wasp.retreat();
        }
      });
    });

    this.wasps.getChildren().forEach(w => w.update(this._gameTime, windVec));

    // Wasps pick up dropped honey and carry it back to their hive
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.honeyCarried > 0 || wasp.poisonCarried || wasp.isRetreating) return;
      this.pickups.getChildren().forEach(pickup => {
        if (!pickup.active || pickup.type !== 'honey') return;
        if (Phaser.Math.Distance.Between(wasp.x, wasp.y, pickup.x, pickup.y) < 30) {
          pickup.release();
          wasp.honeyCarried = PICKUP.HONEY_AMOUNT;
          wasp._startHoneyGlow?.();
          if (typeof wasp.retreat === 'function') wasp.retreat();
        }
      });
    });

    this.workers.getChildren().forEach(w => {
      if (w.alive) w.update(this._gameTime, scaledDelta, this.resources);
    });

    this._towerList.forEach(tower => {
      if (tower.towerType === 'resin')  tower.update(this._gameTime, this.wasps);
      else if (tower.towerType === 'guard' && tower.active) tower.guard.update(this._gameTime, this.wasps, this.stingers);
    });

    // Soldiers
    this.soldiers.getChildren().forEach(s => {
      if (s.alive) s.update(this._gameTime, this.player, this.wasps, this.breakables, this.stingers);
    });

    // Butterflies
    this.butterflies.getChildren().forEach(b =>
      b.update(this._gameTime, scaledDelta, this.player, this.pollination, this.flowers)
    );

    // Spiders
    const _spiderAnchors = [
      ...this.flowers.getChildren().filter(f => f.active && f.lifecycle !== 'young'),
      ...this._decoList.filter(d => d.active),
      ...this.breakables.getChildren().filter(b => b.active),
    ];
    this.spiders.getChildren().forEach(s =>
      s.update(this._gameTime, scaledDelta, _spiderAnchors, (f1, f2) => this._placeWeb(f1, f2))
    );

    // Apply wind to all flying entities (adds to velocity already set this frame)
    this._applyWind(windVec);

    // Web trapping (runs after wind so trapped entities don't drift)
    const trappableEntities = [
      ...(this.player.alive ? [this.player] : []),
      ...this.wasps.getChildren().filter(w => w.active),
      ...this.workers.getChildren().filter(w => w.alive && w.active),
      ...this.soldiers.getChildren().filter(w => w.alive && w.active),
    ];
    this._webList = this._webList.filter(w => {
      if (!w.active) return false;
      return !w.update(this._gameTime, trappableEntities);
    });

    this._checkWorkerHunterCollisions(this._gameTime);
    this._checkRaiderTowerCollisions(this._gameTime);

    if (Phaser.Input.Keyboard.JustDown(this._bKey)) {
      if (this.buildMenu.visible) this.buildMenu.hide();
      else this.buildMenu.show();
    }
    
    if (this._playground && Phaser.Input.Keyboard.JustDown(this._hKey)) {
      this.resources.addPendingSap(100);
      this.resources.convertSap(100);
    }

    if (!this._playground) {
      const wave = this.waveManager.update(this._playTime);
      if (wave) this.waspHiveSystem.spawnWave(wave);
    }
    this.waspHiveSystem.update(this._gameTime);
    if (_pad && this._playground && this._pgBtns) this._updatePlaygroundGamepad(_pad);
    this._touchControls.update();
  }

  _dropPickup(x, y, type) {
    let p = this.pickups.getFirstDead(false);
    if (!p) { p = new Pickup(this, x, y); this.pickups.add(p); }
    p.fire(x, y, type);
  }

  _showPause() {
    if (this._pauseObjs) return;
    this._paused = true;
    this.physics.world.pause();
    if (this.buildMenu.visible) this.buildMenu.hide();

    const cx = 640, cy = 360, D = 500;
    const objs = [];
    const add = obj => { objs.push(obj); return obj; };

    add(this.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.72).setDepth(D - 1).setScrollFactor(0).setInteractive());
    add(this.add.text(cx, cy - 150, 'PAUSED', {
      fontSize: '52px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D).setScrollFactor(0));

    const mkBtn = (label, y, color = '#ffd700') => {
      const b = add(this.add.text(cx, y, label, {
        fontSize: '30px', color, fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(D).setScrollFactor(0).setInteractive({ useHandCursor: true }));
      b._col = color;
      b.on('pointerover', () => b.setColor('#ffffff'));
      b.on('pointerout',  () => b.setColor(b._col));
      return b;
    };

    const btnResume   = mkBtn('[ RESUME ]',   cy - 50);
    const btnControls = mkBtn('[ CONTROLS ]', cy + 20);
    const btnRestart  = mkBtn('[ RESTART ]',  cy + 90);
    const btnMenu     = mkBtn('[ MENU ]',     cy + 160, '#aaaaaa');

    btnResume.on('pointerdown',   () => this._hidePause());
    btnControls.on('pointerdown', () => this._showPauseControls());
    btnRestart.on('pointerdown',  () => { this._hidePause(); this.scene.start('GameScene', { playground: this._playground }); });
    btnMenu.on('pointerdown',     () => this.scene.start('MenuScene'));

    this._pauseBtns    = [btnResume, btnControls, btnRestart, btnMenu];
    this._pauseActions = [
      () => this._hidePause(),
      () => this._showPauseControls(),
      () => { this._hidePause(); this.scene.start('GameScene', { playground: this._playground }); },
      () => this.scene.start('MenuScene'),
    ];
    this._pauseSelIdx    = 0;
    this._gpPauseAWas    = false;
    this._gpPauseDirWas  = false;
    this._gpPauseBWas    = false;
    this._gpRefreshPause();
    this._pauseObjs = objs;
  }

  _gpRefreshPause() {
    this._pauseBtns?.forEach((b, i) => b.setColor(i === this._pauseSelIdx ? '#ffffff' : b._col));
  }

  _updatePauseGamepad(pad) {
    if (this._pauseCtrlObjs) {
      const bDown = pad.buttons[1]?.pressed ?? false;
      if (bDown && !this._gpPauseBWas) this._hidePauseControls();
      this._gpPauseBWas = bDown;
      return;
    }
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpPauseDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._pauseSelIdx = (this._pauseSelIdx + dy + this._pauseBtns.length) % this._pauseBtns.length;
      this._gpRefreshPause();
    }
    this._gpPauseDirWas = dirDown;
    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpPauseAWas) this._pauseActions[this._pauseSelIdx]?.();
    this._gpPauseAWas = aDown;
    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpPauseBWas) this._hidePause();
    this._gpPauseBWas = bDown;
  }

  _hidePause() {
    if (!this._pauseObjs) return;
    this._hidePauseControls();
    this._pauseObjs.forEach(o => o.destroy());
    this._pauseObjs = null;
    this._paused = false;
    this.physics.world.resume();
    if (this.player) this.player._gpAWasDown = true;
  }

  _showPauseControls() {
    if (this._pauseCtrlObjs) return;
    const cx = 640, cy = 360, D = 501;
    const objs = [];
    const add = obj => { objs.push(obj); return obj; };

    add(this.add.rectangle(cx, cy, 800, 530, 0x000000, 0.97).setDepth(D).setScrollFactor(0));
    add(this.add.text(cx, cy - 230, 'CONTROLS', {
      fontSize: '30px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D).setScrollFactor(0));

    const s = { fontSize: '17px', color: '#ffffff', fontFamily: 'monospace' };
    const h = { ...s, color: '#ffdd44', fontSize: '19px', fontStyle: 'bold' };
    const lh = 32, top = cy - 175, col1 = cx - 330, col2 = cx + 60;

    const kbLines = ['KEYBOARD', 'WASD / Arrows  —  Move', 'Space          —  Dash', 'Right-click    —  Aim', 'B              —  Build menu', 'Esc            —  Pause'];
    const gpLines = ['CONTROLLER', 'Left stick     —  Move', 'A button       —  Dash', 'Right stick    —  Aim', 'B button       —  Build menu', 'Start          —  Pause'];

    kbLines.forEach((label, i) =>
      add(this.add.text(col1, top + i * lh, label, i === 0 ? h : s).setOrigin(0, 0.5).setDepth(D).setScrollFactor(0))
    );
    gpLines.forEach((label, i) =>
      add(this.add.text(col2, top + i * lh, label, i === 0 ? h : s).setOrigin(0, 0.5).setDepth(D).setScrollFactor(0))
    );

    const btnBack = add(this.add.text(cx, cy + 225, '[ BACK ]', {
      fontSize: '22px', color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    btnBack.on('pointerover', () => btnBack.setColor('#ff8888'));
    btnBack.on('pointerout',  () => btnBack.setColor('#ff4444'));
    btnBack.on('pointerdown', () => this._hidePauseControls());

    this._pauseCtrlObjs = objs;
  }

  _hidePauseControls() {
    if (!this._pauseCtrlObjs) return;
    this._pauseCtrlObjs.forEach(o => o.destroy());
    this._pauseCtrlObjs = null;
  }

  _burst(x, y, color, count = 8) {
    const e = this.add.particles(x, y, 'particle', {
      speed: { min: 60, max: 160 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 450,
      tint: color,
      emitting: false,
    });
    e.explode(count);
    this.time.delayedCall(500, () => { if (e?.scene) e.destroy(); });
  }

  _collectXp(val) {
    this.xp += val;
    if (this.xp >= this.reqXp) {
      this.xpFloor = this.reqXp;
      this.level++;
      this._xpIncrement = Math.floor(this._xpIncrement * XP.REQ_MULTIPLIER);
      this.reqXp = this.xpFloor + this._xpIncrement;
      if (this.buildMenu.visible) this.buildMenu.hide();
      this.levelUpMenu.show(this.upgrades);
    }
  }

  _spawnFlower(x, y, initialBloom = false) {
    if (this.flowers.getLength() >= FLOWER.MAX_COUNT) return;
    const type = pickFlowerType(Phaser.Math.Between(1, 100));
    const f = new Flower(this, x, y, type, initialBloom);
    f.setDepth(DEPTH.ENVIRONMENT);
    f.onDead = () => {
      const fx = f.x, fy = f.y;
      const grassImg = this.add.image(fx, fy, 'grass-deco', Phaser.Math.Between(0, 6))
        .setScale(Phaser.Math.FloatBetween(0.08, 0.12))
        .setAlpha(0.85)
        .setFlipX(Math.random() < 0.5)
        .setCrop(4, 4, 392, 392)
        .setDepth(DEPTH.ENVIRONMENT);
      this.time.delayedCall(FLOWER.GRASS_DURATION, () => { grassImg.destroy(); });
      this.time.delayedCall(FLOWER.RESPAWN_DELAY, () => {
        if (!this._ended) {
          const rx = Phaser.Math.Between(100, WORLD.WIDTH - 100);
          const ry = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
          this._spawnFlower(rx, ry);
        } else {
          this.flowers.refresh();
        }
      });
    };
    this.flowers.add(f);
    this.flowers.refresh();
  }

  _spawnInitialFlowers() {
    for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
      const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
      this._spawnFlower(x, y, true);
    }
  }

  _spawnPassiveEntities() {
    for (let i = 0; i < BUTTERFLY.COUNT; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      this.butterflies.add(new Butterfly(this, x, y));
    }
    for (let i = 0; i < SPIDER.COUNT; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      this.spiders.add(new Spider(this, x, y));
    }
    // Initial breakables
    for (let i = 0; i < 3; i++) {
      this._spawnBreakable();
    }
  }

  _spawnBreakable() {
    if (this.breakables.countActive(true) >= BREAKABLE.MAX_COUNT) return;
    const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
    const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
    const b = new Breakable(this, x, y);
    this.breakables.add(b);
  }

  _placeWeb(f1, f2) {
    const activeWebs = this._webList.filter(w => w.active);
    if (activeWebs.length >= WEB.MAX_COUNT) return;
    this._webList.push(new WebTrap(this, f1, f2));
  }

  _applyWind(windVec) {
    const applyTo = (entity) => {
      if (!entity.active || !entity.body) return;
      entity.body.velocity.x += windVec.x;
      entity.body.velocity.y += windVec.y;
    };
    if (this.player.alive) applyTo(this.player);
    this.wasps.getChildren().forEach(applyTo);
    this.workers.getChildren().forEach(w => { if (w.alive) applyTo(w); });
    this.butterflies.getChildren().forEach(applyTo);
  }

  _checkWorkerHunterCollisions(time) {
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.waspType !== 'hunter') return;
      if (time - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      this.workers.getChildren().forEach(worker => {
        if (!worker.active || !worker.alive) return;
        if (Phaser.Math.Distance.Between(wasp.x, wasp.y, worker.x, worker.y) > 20) return;
        wasp.lastHit = time;
        if (worker._sap > 0) {
          worker._sap = Math.max(0, worker._sap - WASP.SAP_STEAL);
        } else {
          worker.takeDamage(WASP.DAMAGE);
        }
      });
      this.soldiers.getChildren().forEach(soldier => {
        if (!soldier.active || !soldier.alive) return;
        if (Phaser.Math.Distance.Between(wasp.x, wasp.y, soldier.x, soldier.y) > 30) return;
        wasp.lastHit = time;
        soldier.takeDamage(WASP.DAMAGE);
      });
    });
  }

  _checkRaiderTowerCollisions(time) {
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.waspType !== 'raider' || wasp.isRetreating) return;
      if (time - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      this._towerList.forEach(tower => {
        if (tower.hp <= 0) return;
        if (tower.towerType === 'guard' && !tower.active) return;
        if (tower.towerType !== 'guard' && tower.towerType !== 'nectar-fountain') return;
        if (Phaser.Math.Distance.Between(wasp.x, wasp.y, tower.x, tower.y) > 40) return;
        wasp.lastHit = time;
        if (tower.takeDamage(WASP.DAMAGE) && tower.towerType === 'nectar-fountain') {
          // Clear butterfly fountain refs when destroyed
          this.butterflies.getChildren().forEach(b => {
            if (b._fountain === tower) b._fountain = null;
          });
        }
        wasp.retreat();
      });
    });
  }

  _recruitWorker() {
    if (!this.resources.spendHoney(WORKER.COST)) return;
    const w = new WorkerBee(this, this.hiveX, this.hiveY);
    w.init(this.hive, this.flowers);
    this.workers.add(w);
  }

  _recruitSoldier(free = false) {
    if (!free && !this.resources.spendHoney(SOLDIER.COST)) return;
    const s = new SoldierBee(this, this.hiveX, this.hiveY);
    s.damage = SOLDIER.DAMAGE + (this._metaSoldierDmg ?? 0) + this.upgrades.getLevel('SOLDIER_DMG');
    s.fireRate = Math.max(400, SOLDIER.FIRE_RATE - this.upgrades.getLevel('SOLDIER_RATE') * 100);
    this.soldiers.add(s);
  }

  _enterPlacementMode(towerKey) {
    this._placing = towerKey;
    const ghostMap = {
      'guard-post':      { key: 'misc',           frame: 0, scale: 0.1  },
      'resin-trap':      { key: 'misc',           frame: 8, scale: 0.1  },
      'poison-honey':    { key: 'misc',           frame: 9, scale: 0.08 },
      'nectar-fountain': { key: 'nectar-fountain', frame: 0, scale: 0.25 },
    };
    const gi = ghostMap[towerKey] || { key: towerKey, frame: 0, scale: 1 };
    const startX = this.player ? this.player.x + 70 : this.cameras.main.scrollX + 640;
    const startY = this.player ? this.player.y : this.cameras.main.scrollY + 360;
    this._ghost = this.add.image(startX, startY, gi.key, gi.frame).setAlpha(0.5).setDepth(50).setScale(gi.scale);
    this._gpPlaceAWas = true;
    this._gpPlaceBWas = true;
    this._placeHint = this.add.text(640, 30,
      'A / Click: place  |  B / ESC: cancel',
      { fontSize: '16px', color: '#ffff88', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.input.once('pointerdown', this._onPlacementPlace, this);
    this.input.keyboard.addKey('ESC').once('down', () => this._cancelPlacement());
  }

  _isGhostValid() {
    if (!this._ghost) return false;
    const margin = 30;
    return this._ghost.x >= margin && this._ghost.x <= WORLD.WIDTH - margin &&
           this._ghost.y >= margin && this._ghost.y <= WORLD.HEIGHT - margin &&
           Phaser.Math.Distance.Between(this._ghost.x, this._ghost.y, this.hiveX, this.hiveY) >= 100;
  }

  _onPlacementPlace(pointer) {
    const wx = this._ghost ? this._ghost.x : pointer.worldX;
    const wy = this._ghost ? this._ghost.y : pointer.worldY;
    const margin = 30;
    if (wx < margin || wx > WORLD.WIDTH - margin || wy < margin || wy > WORLD.HEIGHT - margin ||
        Phaser.Math.Distance.Between(wx, wy, this.hiveX, this.hiveY) < 100) {
      // Re-register so player can try again
      this.input.once('pointerdown', this._onPlacementPlace, this);
      return;
    }
    this._placeTower(this._placing, wx, wy);
    this._cancelPlacement();
  }

  _cancelPlacement() {
    if (this._ghost) { this._ghost.destroy(); this._ghost = null; }
    if (this._placeHint) { this._placeHint.destroy(); this._placeHint = null; }
    this._placing = null;
    if (this.player) this.player._gpAWasDown = true;
    this.input.off('pointerdown', this._onPlacementPlace, this);
  }

  _placeTower(key, x, y) {
    const costs = {
      'resin-trap':      TOWER.RESIN_TRAP_COST,
      'guard-post':      TOWER.GUARD_POST_COST,
      'poison-honey':    TOWER.POISON_HONEY_COST,
      'nectar-fountain': NECTAR_FOUNTAIN.COST,
    };
    if (!this.resources.spendHoney(costs[key])) return;
    let tower;
    if (key === 'resin-trap') tower = new ResinTrap(this, x, y);
    else if (key === 'guard-post') tower = new GuardPost(this, x, y);
    else if (key === 'poison-honey') tower = new PoisonHoney(this, x, y);
    else if (key === 'nectar-fountain') {
      tower = new NectarFountain(this, x, y);
      this._assignFountainButterfly(tower);
    }
    if (tower) this._towerList.push(tower);
  }

  _assignFountainButterfly(fountain) {
    let closest = null, closestDist = Infinity;
    this.butterflies.getChildren().forEach(b => {
      if (!b.active || b._fountain) return;
      const d = Phaser.Math.Distance.Between(b.x, b.y, fountain.x, fountain.y);
      if (d < closestDist) { closest = b; closestDist = d; }
    });
    if (closest) closest._fountain = fountain;
  }

  _applyUpgrade(key) {
    const lvl = this.upgrades.getLevel(key);
    switch (key) {
      case 'BEE_SPEED':
        this.player._speed = BEE.SPEED + (this._metaSpeedBonus ?? 0) + lvl * 20;
        break;
      case 'BEE_CAPACITY':
        this.player._sapCapacity = BEE.SAP_CAPACITY + lvl * 3;
        break;
      case 'BEE_STINGER_DMG':
        this.player._stingerDamage = BEE.STINGER_DAMAGE + lvl;
        break;
      case 'BEE_STINGER_RATE':
        this.player._stingerRate = Math.max(200, BEE.STINGER_RATE - lvl * 100);
        break;
      case 'BEE_STINGER_DIST':
        this.player._stingerRange = BEE.STINGER_RANGE + lvl * 40;
        break;
      case 'BEE_STINGER_SPEED':
        this.player._stingerSpeed = BEE.STINGER_SPEED + lvl * 80;
        break;
      case 'BEE_HP':
        this.player.maxHp = BEE.HP + lvl * 2;
        this.player.hp = Math.min(this.player.hp + 2, this.player.maxHp);
        break;
      case 'BEE_ARMOR':
        this.player.armor = lvl;
        break;
      case 'HIVE_STORAGE':
        this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + lvl * 50);
        break;
      case 'HIVE_PRODUCTION':
        this._conversionTimer.reset({
          delay: Math.max(500, HIVE.SAP_CONVERSION_INTERVAL - lvl * 300),
          callback: () => this.resources.convertSap(1),
          loop: true,
        });
        break;
      case 'HIVE_HP':
        this.hive.maxHp = HIVE.HP + lvl * 5;
        this.hive.hp = Math.min(this.hive.hp + 5, this.hive.maxHp);
        break;
      case 'HIVE_WORKERS':
        const w = new WorkerBee(this, this.hiveX, this.hiveY);
        w.init(this.hive, this.flowers);
        this.workers.add(w);
        break;
      case 'SOLDIER_DMG':
        this.soldiers.getChildren().forEach(s => {
          s.damage = SOLDIER.DAMAGE + (this._metaSoldierDmg ?? 0) + lvl;
        });
        break;
      case 'SOLDIER_RATE':
        this.soldiers.getChildren().forEach(s => {
          s.fireRate = Math.max(400, SOLDIER.FIRE_RATE - lvl * 100);
        });
        break;
    }
  }

  _createPlaygroundUI() {
    const s  = { fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, fontFamily: 'monospace' };
    const hs = { ...s, fontSize: '16px', color: '#ffdd44' };
    const ws = { ...s, fontSize: '14px', color: '#aaffaa' };

    this.add.text(640, 16, 'PLAYGROUND  (RB=cycle  X=select)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);

    this._pgWavePresets = [
      { label: 'Easy',   wave: 1   },
      { label: 'Normal', wave: 5   },
      { label: 'Hard',   wave: 10  },
      { label: 'Brutal', wave: 20  },
      { label: 'Insane', wave: 50  },
      { label: 'ULTRA',  wave: 100 },
    ];
    this._pgWaveIdx = 0;

    this._pgWaveInfoText = this.add.text(640, 676, '', ws)
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(200);

    const pgDefs = [
      { x: 380,  y: 660, label: '[ Spawn Hunter ]', action: () => this._spawnPlaygroundWasp('hunter') },
      { x: 560,  y: 660, label: '[ Spawn Raider ]', action: () => this._spawnPlaygroundWasp('raider') },
      { x: 740,  y: 660, label: '[ Spawn Archer ]', action: () => this._spawnPlaygroundWasp('archer') },
      { x: 910,  y: 660, label: '[ Max Honey ]',    action: () => this.resources.addHoney(this.resources.getHoneyStorage()) },
      { x: 1060, y: 660, label: '[ Exit ]',         action: () => this.scene.start('MenuScene') },
      { x: 510,  y: 700, label: '[ < ]',            action: () => this._cycleWave(-1) },
      { x: 640,  y: 700, label: '[ Spawn Wave: Easy ]', action: () => this._spawnPlaygroundWave(), isWaveBtn: true },
      { x: 770,  y: 700, label: '[ > ]',            action: () => this._cycleWave(1) },
    ];

    this._pgBtns    = pgDefs.map(d => {
      const b = this.add.text(d.x, d.y, d.label, s)
        .setOrigin(0.5, 1).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
      b.on('pointerover',  () => b.setColor('#ffaa00'));
      b.on('pointerout',   () => b.setColor('#ffffff'));
      b.on('pointerdown',  d.action);
      if (d.isWaveBtn) this._pgWaveBtn = b;
      return b;
    });
    this._pgActions  = pgDefs.map(d => d.action);
    this._pgSelIdx   = 0;
    this._pgGpLBWas  = false;
    this._pgGpRBWas  = false;
    this._pgGpXWas   = false;
    this._updatePgWaveDisplay();
    this._pgRefresh();
  }

  _updatePgWaveDisplay() {
    const preset = this._pgWavePresets[this._pgWaveIdx];
    const spec   = this._waveSpecFromLevel(preset.wave);
    this._pgWaveBtn?.setText(`[ Spawn Wave: ${preset.label} ]`);
    this._pgWaveInfoText?.setText(`Lv.${preset.wave} — ${spec.hunterCount} hunters  ${spec.raiderCount} raiders  ${spec.archerCount} archers`);
  }

  _cycleWave(dir) {
    this._pgWaveIdx = (this._pgWaveIdx + dir + this._pgWavePresets.length) % this._pgWavePresets.length;
    this._updatePgWaveDisplay();
  }

  _waveSpecFromLevel(n) {
    const total       = WAVE.BASE_COUNT + (n - 1) * WAVE.COUNT_INCREMENT;
    const raiderCount = n >= 3  ? Math.floor(total * 0.4)      : 0;
    const archerCount = n >= 4  ? Math.max(1, Math.floor(total * 0.2)) : 0;
    const hunterCount = Math.max(0, total - raiderCount - archerCount);
    return { number: n, hunterCount, raiderCount, archerCount };
  }

  _spawnPlaygroundWave() {
    const preset = this._pgWavePresets[this._pgWaveIdx];
    this.waspHiveSystem.spawnWave(this._waveSpecFromLevel(preset.wave));
  }

  _pgRefresh() {
    this._pgBtns?.forEach((b, i) => b.setColor(i === this._pgSelIdx ? '#ffaa00' : '#ffffff'));
  }

  _updatePlaygroundGamepad(pad) {
    const lbDown = pad.buttons[4]?.pressed ?? false;
    if (lbDown && !this._pgGpLBWas) {
      this._pgSelIdx = (this._pgSelIdx - 1 + this._pgBtns.length) % this._pgBtns.length;
      this._pgRefresh();
    }
    this._pgGpLBWas = lbDown;

    const rbDown = pad.buttons[5]?.pressed ?? false;
    if (rbDown && !this._pgGpRBWas) {
      this._pgSelIdx = (this._pgSelIdx + 1) % this._pgBtns.length;
      this._pgRefresh();
    }
    this._pgGpRBWas = rbDown;

    const xDown = pad.buttons[2]?.pressed ?? false;
    if (xDown && !this._pgGpXWas) this._pgActions[this._pgSelIdx]?.();
    this._pgGpXWas = xDown;
  }

  _spawnPlaygroundWasp(type) {
    const hx = this.waspHiveSystem.hive.x;
    const hy = this.waspHiveSystem.hive.y;
    if (type === 'hunter') {
      const w = new HunterWasp(this, hx, hy);
      w.setTarget(this.player);
      this.wasps.add(w);
    } else if (type === 'raider') {
      const w = new RaiderWasp(this, hx, hy, this.hive, this.hive, this.waspHiveSystem.hive);
      this.wasps.add(w);
    } else if (type === 'archer') {
      const w = new ArcherWasp(this, hx, hy);
      w.setTarget(this.player);
      this.wasps.add(w);
    }
  }

  _onPlayerDeath() {
    if (this.resources.spendHoney(BEE.RESPAWN_COST)) {
      this.time.delayedCall(2000, () => {
        if (!this._ended) this.player.respawn(this.hiveX, this.hiveY);
      });
    } else {
      this._endGame(false); // can't afford respawn
    }
  }

  _endGame(won, wonByDestruction = false) {
    if (this._ended) return;
    this._ended = true;
    const score = this._calculateScore();
    const waves = this.waveManager.getWaveNumber();
    const timeSurvived = Math.floor(this._playTime / 1000);
    this.scene.start('GameOverScene', { won, score, waves, timeSurvived, wonByDestruction, playground: this._playground ?? false });
  }

  _calculateScore() {
    return Math.floor(
      this.resources.getHoney() * 10 +
      this.waveManager.getWaveNumber() * 100
    );
  }
}
