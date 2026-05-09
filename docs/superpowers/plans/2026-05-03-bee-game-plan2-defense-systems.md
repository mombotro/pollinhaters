# Bee Game — Plan 2: Defense Systems

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add worker bees, three tower types (StingerTurret, ResinTrap, GuardPost/GuardBee), in-scene build and upgrade menus, mutable player stats, and the UpgradeManager system.

**Architecture:** All new game entities follow the existing `Phaser.Physics.Arcade.Sprite` pattern. New pure-JS systems (UpgradeManager) are framework-agnostic and tested with Vitest. Tower placement uses a ghost-sprite following the pointer in world space, confirmed with `pointerdown`. Build and upgrade menus are in-scene text overlays (`setScrollFactor(0)`, `setDepth(200+)`). Worker bees use distance-based collision with wasps (not `physics.add.overlap`) to sidestep Phaser 3's group/sprite arg-swap bug.

**Critical Phaser note:** `physics.add.overlap(group, singleSprite, cb)` in Phaser 3 internally calls `collideSpriteVsGroup(sprite, group)`, so `cb` receives `(sprite, groupChild)` — swapped from what you passed. Always detect which arg is the wasp with `const wasp = a.waspType ? a : b`. This is already done in `GameScene.js` for hunters vs player and raiders vs hive. New overlaps must follow the same pattern.

**Tech Stack:** Phaser 3.87, Vite 5, Vitest 2, vanilla JS

**Series:** Plan 2 of 4. Builds directly on Plan 1. Plan 3 = passive world entities. Plan 4 = meta-progression + LocalStorage.

---

## File Map

```
bee-game/
├── src/
│   ├── constants.js                   MODIFY — add WORKER, TOWER, UPGRADE exports
│   ├── scenes/
│   │   ├── BootScene.js               MODIFY — generate 5 new placeholder textures
│   │   └── GameScene.js               MODIFY — wire workers, towers, menus, upgrades
│   ├── entities/
│   │   ├── PlayerBee.js               MODIFY — mutable stat fields + armor
│   │   ├── HunterWasp.js              MODIFY — slowedUntil field, update(time) signature
│   │   ├── RaiderWasp.js              MODIFY — slowedUntil field, update(time) signature
│   │   ├── Stinger.js                 MODIFY — optional damage param
│   │   ├── Flower.js                  MODIFY — claimedBy field (init to null)
│   │   ├── WorkerBee.js               CREATE
│   │   └── GuardBee.js                CREATE
│   ├── systems/
│   │   ├── ResourceManager.js         MODIFY — add setHoneyStorage(), addPendingSap()
│   │   └── UpgradeManager.js          CREATE
│   ├── towers/
│   │   ├── StingerTurret.js           CREATE
│   │   ├── ResinTrap.js               CREATE
│   │   └── GuardPost.js               CREATE
│   └── ui/
│       ├── HUD.js                     MODIFY — add workerCount param to update()
│       ├── BuildMenu.js               CREATE
│       └── UpgradeMenu.js             CREATE
└── tests/
    ├── ResourceManager.test.js        MODIFY — add tests for setHoneyStorage, addPendingSap
    └── UpgradeManager.test.js         CREATE
```

---

### Task 1: Add WORKER, TOWER, UPGRADE constants

**Files:**
- Modify: `src/constants.js`

- [ ] **Step 1: Add new constant blocks to the end of `src/constants.js`**

Append these three exports after the existing `TIMER` export:

```js
export const WORKER = {
  SPEED: 120,
  SAP_CAPACITY: 8,
  HP: 3,
  COST: 30,              // honey to recruit
};

export const TOWER = {
  STINGER_TURRET_COST: 40,
  STINGER_TURRET_RANGE: 180,
  STINGER_TURRET_DAMAGE: 1,
  STINGER_TURRET_RATE: 1000,   // ms between shots
  RESIN_TRAP_COST: 25,
  RESIN_TRAP_RADIUS: 60,
  RESIN_TRAP_SLOW: 0.4,        // speed multiplier for slowed wasps
  RESIN_TRAP_DURATION: 3000,   // ms slow lasts
  GUARD_POST_COST: 50,
  GUARD_BEE_HP: 4,
  GUARD_BEE_SPEED: 130,
  GUARD_BEE_RANGE: 120,
  GUARD_BEE_DAMAGE: 1,
  GUARD_BEE_RATE: 900,         // ms between guard bee shots
};

export const UPGRADE = {
  MAX_LEVEL: 5,
  COSTS: [20, 40, 70, 110, 160],   // honey cost for level 0→1, 1→2, … 4→5
};
```

- [ ] **Step 2: Verify imports compile**

Run: `npx vite build --mode development 2>&1 | head -20`

Expected: no error lines containing `constants.js`.

- [ ] **Step 3: Commit**

```
git add src/constants.js
git commit -m "feat: add WORKER, TOWER, UPGRADE constants"
```

---

### Task 2: Add new placeholder textures in BootScene

**Files:**
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Add 5 new textures before `g.destroy()`**

Open `src/scenes/BootScene.js`. Before the `g.destroy()` line (line 54), insert:

```js
    // worker-bee: smaller yellow circle
    g.clear();
    g.fillStyle(0xffcc00);
    g.fillCircle(12, 12, 10);
    g.generateTexture('worker-bee', 24, 24);

    // guard-bee: blue circle
    g.clear();
    g.fillStyle(0x4488ff);
    g.fillCircle(14, 14, 12);
    g.generateTexture('guard-bee', 28, 28);

    // stinger-turret: dark grey hexagon approximated as circle with ring
    g.clear();
    g.fillStyle(0x444444);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x888888);
    g.fillCircle(20, 20, 10);
    g.generateTexture('stinger-turret', 40, 40);

    // resin-trap: amber translucent blob
    g.clear();
    g.fillStyle(0xcc8800, 0.7);
    g.fillCircle(24, 24, 22);
    g.generateTexture('resin-trap', 48, 48);

    // guard-post: brown square with inner diamond
    g.clear();
    g.fillStyle(0x886633);
    g.fillRect(0, 0, 40, 40);
    g.fillStyle(0xffcc00);
    g.fillRect(10, 10, 20, 20);
    g.generateTexture('guard-post', 40, 40);
```

- [ ] **Step 2: Run the dev server and confirm no texture errors**

Run: `npm run dev`

Open the browser, start a game. The console should have no "missing texture" errors. Kill the server with Ctrl+C.

- [ ] **Step 3: Commit**

```
git add src/scenes/BootScene.js
git commit -m "feat: add placeholder textures for worker, guard, and tower sprites"
```

---

### Task 3: Extend ResourceManager + update tests

**Files:**
- Modify: `src/systems/ResourceManager.js`
- Modify: `tests/ResourceManager.test.js`

- [ ] **Step 1: Write the failing tests first**

Open `tests/ResourceManager.test.js` and add these two test cases inside the existing `describe` block, after the last `it(...)`:

```js
  it('setHoneyStorage raises cap and allows more honey', () => {
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    rm.setHoneyStorage(200);
    rm.addSap('player', 10, 10);
    rm.depositSap('player');
    rm.convertSap(10);
    expect(rm.getHoney()).toBe(20);
  });

  it('addPendingSap increments pending sap directly', () => {
    rm.addPendingSap(7);
    expect(rm.getPendingSap()).toBe(7);
    rm.convertSap(7);
    expect(rm.getHoney()).toBe(7);
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/ResourceManager.test.js`

Expected: 2 failures — `rm.setHoneyStorage is not a function` and `rm.addPendingSap is not a function`.

- [ ] **Step 3: Implement the two new methods**

Open `src/systems/ResourceManager.js` and add these two methods after `spendHoney`:

```js
  setHoneyStorage(cap) {
    this._honeyStorage = cap;
  }

  addPendingSap(amount) {
    this._pendingSap += amount;
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run tests/ResourceManager.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/systems/ResourceManager.js tests/ResourceManager.test.js
git commit -m "feat: add setHoneyStorage and addPendingSap to ResourceManager"
```

---

### Task 4: Create UpgradeManager + tests

**Files:**
- Create: `src/systems/UpgradeManager.js`
- Create: `tests/UpgradeManager.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/UpgradeManager.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import UpgradeManager from '../src/systems/UpgradeManager.js';
import ResourceManager from '../src/systems/ResourceManager.js';

describe('UpgradeManager', () => {
  let um, rm;

  beforeEach(() => {
    um = new UpgradeManager();
    rm = new ResourceManager({ honeyStorage: 1000, sapConversionRate: 1 });
    // fund the resource manager with 500 honey
    rm.addPendingSap(500);
    rm.convertSap(500);
  });

  it('all upgrade keys start at level 0', () => {
    const keys = [
      'BEE_SPEED', 'BEE_CAPACITY', 'BEE_STINGER_DMG', 'BEE_STINGER_RATE',
      'BEE_HP', 'BEE_ARMOR', 'HIVE_STORAGE', 'HIVE_PRODUCTION',
      'HIVE_HP', 'HIVE_WORKERS',
    ];
    keys.forEach(k => expect(um.getLevel(k)).toBe(0));
  });

  it('getCost returns first-level cost when at level 0', () => {
    expect(um.getCost('BEE_SPEED')).toBe(20);
  });

  it('getCost returns null when at max level', () => {
    for (let i = 0; i < 5; i++) um.purchase('BEE_SPEED', rm);
    expect(um.getCost('BEE_SPEED')).toBeNull();
  });

  it('purchase increments level and deducts honey', () => {
    const before = rm.getHoney();
    expect(um.purchase('BEE_SPEED', rm)).toBe(true);
    expect(um.getLevel('BEE_SPEED')).toBe(1);
    expect(rm.getHoney()).toBe(before - 20);
  });

  it('purchase fails when not enough honey', () => {
    const poor = new ResourceManager({ honeyStorage: 100, sapConversionRate: 1 });
    expect(um.purchase('BEE_SPEED', poor)).toBe(false);
    expect(um.getLevel('BEE_SPEED')).toBe(0);
  });

  it('purchase fails when already at max level', () => {
    for (let i = 0; i < 5; i++) um.purchase('BEE_SPEED', rm);
    const honey = rm.getHoney();
    expect(um.purchase('BEE_SPEED', rm)).toBe(false);
    expect(rm.getHoney()).toBe(honey);
  });

  it('getCost increases after each purchase', () => {
    um.purchase('BEE_SPEED', rm);
    expect(um.getCost('BEE_SPEED')).toBe(40);
    um.purchase('BEE_SPEED', rm);
    expect(um.getCost('BEE_SPEED')).toBe(70);
  });

  it('getBonus returns current level', () => {
    um.purchase('BEE_ARMOR', rm);
    um.purchase('BEE_ARMOR', rm);
    expect(um.getBonus('BEE_ARMOR')).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/UpgradeManager.test.js`

Expected: error — `Cannot find module '../src/systems/UpgradeManager.js'`.

- [ ] **Step 3: Implement UpgradeManager**

Create `src/systems/UpgradeManager.js`:

```js
import { UPGRADE } from '../constants.js';

const KEYS = [
  'BEE_SPEED', 'BEE_CAPACITY', 'BEE_STINGER_DMG', 'BEE_STINGER_RATE',
  'BEE_HP', 'BEE_ARMOR', 'HIVE_STORAGE', 'HIVE_PRODUCTION',
  'HIVE_HP', 'HIVE_WORKERS',
];

export default class UpgradeManager {
  constructor() {
    this._levels = {};
    KEYS.forEach(k => { this._levels[k] = 0; });
  }

  getLevel(key) { return this._levels[key] ?? 0; }

  // Returns honey cost for next purchase, or null if maxed.
  getCost(key) {
    const lvl = this.getLevel(key);
    if (lvl >= UPGRADE.MAX_LEVEL) return null;
    return UPGRADE.COSTS[lvl];
  }

  // Spends honey and increments level. Returns true on success.
  purchase(key, resources) {
    const cost = this.getCost(key);
    if (cost === null) return false;
    if (!resources.spendHoney(cost)) return false;
    this._levels[key]++;
    return true;
  }

  // Returns current level (caller uses this to compute stat value).
  getBonus(key) { return this._levels[key]; }

  // Returns all keys with their current level and next cost.
  getAllEntries() {
    return KEYS.map(key => ({ key, level: this.getLevel(key), cost: this.getCost(key) }));
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run tests/UpgradeManager.test.js`

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```
git add src/systems/UpgradeManager.js tests/UpgradeManager.test.js
git commit -m "feat: add UpgradeManager with level tracking and honey-cost purchasing"
```

---

### Task 5: PlayerBee mutable stats + Stinger optional damage

**Files:**
- Modify: `src/entities/PlayerBee.js`
- Modify: `src/entities/Stinger.js`

- [ ] **Step 1: Add mutable stat fields to PlayerBee constructor**

Open `src/entities/PlayerBee.js`. In `constructor`, after `this._lastFired = 0;`, add:

```js
    this._speed = BEE.SPEED;
    this._sapCapacity = BEE.SAP_CAPACITY;
    this._stingerDamage = BEE.STINGER_DAMAGE;
    this._stingerRate = BEE.STINGER_RATE;
    this.armor = 0;
```

- [ ] **Step 2: Update `_move()` to use `this._speed`**

Change `this.setVelocity(vx * BEE.SPEED, vy * BEE.SPEED);` to:

```js
    this.setVelocity(vx * this._speed, vy * this._speed);
```

- [ ] **Step 3: Update `_autoFire()` to use mutable stats**

Replace the entire `_autoFire` method:

```js
  _autoFire(time) {
    if (!this._onFire || time - this._lastFired < this._stingerRate) return;
    const fired = this._onFire(this.x, this.y, BEE.STINGER_RANGE, this._stingerDamage);
    if (fired) this._lastFired = time;
  }
```

- [ ] **Step 4: Apply armor in `takeDamage()`**

Replace the `takeDamage` method body:

```js
  takeDamage(amount) {
    if (!this.alive) return false;
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
```

- [ ] **Step 5: Update Stinger to accept optional damage param**

Open `src/entities/Stinger.js`. Change the constructor signature and `this.damage` line:

```js
  constructor(scene, x, y, targetX, targetY, damage = BEE.STINGER_DAMAGE) {
```

The line `this.damage = BEE.STINGER_DAMAGE;` already exists — change it to:

```js
    this.damage = damage;
```

- [ ] **Step 6: Update the stinger fire callback in GameScene**

Open `src/scenes/GameScene.js`. The `onFire` callback passed to `PlayerBee` currently is:

```js
      (x, y, range) => {
        let nearest = null, nearestDist = range;
        this.wasps.getChildren().forEach(w => {
          if (!w.active) return;
          const d = Phaser.Math.Distance.Between(x, y, w.x, w.y);
          if (d < nearestDist) { nearest = w; nearestDist = d; }
        });
        if (!nearest) return false;
        const s = new Stinger(this, x, y, nearest.x, nearest.y);
        this.stingers.add(s);
        return true;
      },
```

Replace with:

```js
      (x, y, range, damage) => {
        let nearest = null, nearestDist = range;
        this.wasps.getChildren().forEach(w => {
          if (!w.active) return;
          const d = Phaser.Math.Distance.Between(x, y, w.x, w.y);
          if (d < nearestDist) { nearest = w; nearestDist = d; }
        });
        if (!nearest) return false;
        const s = new Stinger(this, x, y, nearest.x, nearest.y, damage);
        this.stingers.add(s);
        return true;
      },
```

- [ ] **Step 7: Update stinger-vs-wasp overlap to use stinger.damage**

In `GameScene.js`, find:

```js
    this.physics.add.overlap(this.stingers, this.wasps, (stinger, wasp) => {
      stinger.destroy();
      wasp.takeDamage(BEE.STINGER_DAMAGE);
    });
```

Change `BEE.STINGER_DAMAGE` to `stinger.damage`:

```js
    this.physics.add.overlap(this.stingers, this.wasps, (stinger, wasp) => {
      stinger.destroy();
      wasp.takeDamage(stinger.damage);
    });
```

- [ ] **Step 8: Update sap pickup to use player._sapCapacity**

In `GameScene.js`, find the overlap callback for player+flowers. Change both occurrences of `BEE.SAP_CAPACITY` to `this.player._sapCapacity`:

```js
      if (flower.sapRemaining > 0) {
        const space = this.player._sapCapacity - this.resources.getSapCarried('player');
        if (space > 0) {
          const taken = flower.collectSap(space);
          this.resources.addSap('player', taken, this.player._sapCapacity);
        }
      }
```

- [ ] **Step 9: Run the dev server and verify the game still works**

Run: `npm run dev`

Start a game. Bee should move, fire stingers, collect sap, take damage from hunters. Kill the server.

- [ ] **Step 10: Commit**

```
git add src/entities/PlayerBee.js src/entities/Stinger.js src/scenes/GameScene.js
git commit -m "feat: PlayerBee mutable stats and armor; Stinger accepts custom damage"
```

---

### Task 6: Wasp slowedUntil + update(time) signature

**Files:**
- Modify: `src/entities/HunterWasp.js`
- Modify: `src/entities/RaiderWasp.js`
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add slowedUntil to HunterWasp**

Open `src/entities/HunterWasp.js`. In `constructor`, after `this.lastHit = 0;`, add:

```js
    this.slowedUntil = 0;
```

- [ ] **Step 2: Update HunterWasp.update() to accept time and apply slow**

Replace the entire `update` method:

```js
  update(time) {
    if (!this._target || !this._target.active || !this._target.alive) return;
    const speed = time < this.slowedUntil
      ? WASP.HUNTER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.HUNTER_SPEED;
    this.scene.physics.moveToObject(this, this._target, speed);
  }
```

Add the TOWER import at the top of the file:

```js
import { WASP, TOWER } from '../constants.js';
```

(Replace the existing `import { WASP } from '../constants.js';`)

- [ ] **Step 3: Add slowedUntil to RaiderWasp**

Open `src/entities/RaiderWasp.js`. In `constructor`, after `this.lastHit = 0;`, add:

```js
    this.slowedUntil = 0;
```

- [ ] **Step 4: Update RaiderWasp.update() to accept time and apply slow**

Replace the entire `update` method:

```js
  update(time) {
    if (!this._hive || !this._hive.active) return;
    const speed = time < this.slowedUntil
      ? WASP.RAIDER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.RAIDER_SPEED;
    this.scene.physics.moveToObject(this, this._hive, speed);
  }
```

Add the TOWER import at the top:

```js
import { WASP, TOWER } from '../constants.js';
```

- [ ] **Step 5: Pass time in GameScene.update()**

Open `src/scenes/GameScene.js`. Find:

```js
    this.wasps.getChildren().forEach(w => w.update());
```

Change to:

```js
    this.wasps.getChildren().forEach(w => w.update(time));
```

- [ ] **Step 6: Commit**

```
git add src/entities/HunterWasp.js src/entities/RaiderWasp.js src/scenes/GameScene.js
git commit -m "feat: wasps accept time in update() and support slowedUntil for ResinTrap"
```

---

### Task 7: Flower.claimedBy + WorkerBee entity

**Files:**
- Modify: `src/entities/Flower.js`
- Create: `src/entities/WorkerBee.js`

- [ ] **Step 1: Add claimedBy to Flower**

Open `src/entities/Flower.js`. In `constructor`, after `this.pollenCollected = false;`, add:

```js
    this.claimedBy = null;
```

- [ ] **Step 2: Create WorkerBee**

Create `src/entities/WorkerBee.js`:

```js
import Phaser from 'phaser';
import { WORKER } from '../constants.js';

const STATE = { SEEK: 'seek', COLLECT: 'collect', RETURN: 'return' };

export default class WorkerBee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'worker-bee');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.hp = WORKER.HP;
    this.maxHp = WORKER.HP;
    this.alive = true;
    this._sap = 0;
    this._state = STATE.SEEK;
    this._target = null;
    this._hive = null;
    this._flowers = null;
  }

  // Call after construction. hive = Hive sprite, flowers = staticGroup.
  init(hive, flowers) {
    this._hive = hive;
    this._flowers = flowers;
    this._state = STATE.SEEK;
  }

  update(time, delta, resources) {
    if (!this.alive) return;
    switch (this._state) {
      case STATE.SEEK:    this._seekFlower();           break;
      case STATE.COLLECT: this._collectSap();           break;
      case STATE.RETURN:  this._returnToHive(resources); break;
    }
  }

  _seekFlower() {
    // Find nearest unclaimed flower with sap
    let nearest = null, nearestDist = Infinity;
    this._flowers.getChildren().forEach(f => {
      if (!f.active || f.sapRemaining <= 0 || f.claimedBy) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    if (!nearest) { this.setVelocity(0, 0); return; }
    nearest.claimedBy = this;
    this._target = nearest;
    this._state = STATE.COLLECT;
    this.scene.physics.moveToObject(this, this._target, WORKER.SPEED);
  }

  _collectSap() {
    if (!this._target || !this._target.active || this._target.sapRemaining <= 0) {
      if (this._target) this._target.claimedBy = null;
      this._target = null;
      this._state = STATE.SEEK;
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y);
    if (dist > 24) {
      this.scene.physics.moveToObject(this, this._target, WORKER.SPEED);
      return;
    }
    // Arrived — collect as much as capacity allows
    const space = WORKER.SAP_CAPACITY - this._sap;
    if (space > 0) this._sap += this._target.collectSap(space);
    this._target.claimedBy = null;
    this._target = null;
    this._state = STATE.RETURN;
    this.scene.physics.moveToObject(this, this._hive, WORKER.SPEED);
  }

  _returnToHive(resources) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._hive.x, this._hive.y);
    if (dist > 32) {
      this.scene.physics.moveToObject(this, this._hive, WORKER.SPEED);
      return;
    }
    // Deposit directly into pending sap pool
    resources.addPendingSap(this._sap);
    this._sap = 0;
    this._state = STATE.SEEK;
  }

  // Returns true if worker died.
  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.alive = false;
      if (this._target) { this._target.claimedBy = null; this._target = null; }
      this.setVisible(false).setActive(false);
      this.body.enable = false;
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 3: Commit**

```
git add src/entities/Flower.js src/entities/WorkerBee.js
git commit -m "feat: Flower.claimedBy for worker coordination; WorkerBee autonomous sap collector"
```

---

### Task 8: Tower entities — StingerTurret, ResinTrap, GuardBee, GuardPost

**Files:**
- Create: `src/towers/StingerTurret.js`
- Create: `src/towers/ResinTrap.js`
- Create: `src/entities/GuardBee.js`
- Create: `src/towers/GuardPost.js`

Note: `src/towers/` is a new directory — create it by placing files in it.

- [ ] **Step 1: Create StingerTurret**

Create `src/towers/StingerTurret.js`:

```js
import Phaser from 'phaser';
import { TOWER } from '../constants.js';
import Stinger from '../entities/Stinger.js';

export default class StingerTurret extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'stinger-turret');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.towerType = 'stinger';
    this._lastFired = 0;
  }

  update(time, wasps, stingers) {
    if (time - this._lastFired < TOWER.STINGER_TURRET_RATE) return;
    let nearest = null, nearestDist = TOWER.STINGER_TURRET_RANGE;
    wasps.getChildren().forEach(w => {
      if (!w.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    });
    if (!nearest) return;
    stingers.add(new Stinger(this.scene, this.x, this.y, nearest.x, nearest.y, TOWER.STINGER_TURRET_DAMAGE));
    this._lastFired = time;
  }
}
```

- [ ] **Step 2: Create ResinTrap**

Create `src/towers/ResinTrap.js`:

```js
import Phaser from 'phaser';
import { TOWER } from '../constants.js';

export default class ResinTrap extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'resin-trap');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.towerType = 'resin';
  }

  update(time, wasps) {
    wasps.getChildren().forEach(wasp => {
      if (!wasp.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, wasp.x, wasp.y);
      if (dist <= TOWER.RESIN_TRAP_RADIUS) {
        wasp.slowedUntil = time + TOWER.RESIN_TRAP_DURATION;
      }
    });
  }
}
```

- [ ] **Step 3: Create GuardBee**

Create `src/entities/GuardBee.js`:

```js
import Phaser from 'phaser';
import { TOWER } from '../constants.js';
import Stinger from './Stinger.js';

export default class GuardBee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, post) {
    super(scene, x, y, 'guard-bee');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.hp = TOWER.GUARD_BEE_HP;
    this.maxHp = TOWER.GUARD_BEE_HP;
    this.alive = true;
    this._post = post;
    this._lastFired = 0;
  }

  update(time, wasps, stingers) {
    if (!this.alive) return;

    // Orbit the guard post
    const angle = (time / 2000) * Math.PI * 2;
    const tx = this._post.x + Math.cos(angle) * 44;
    const ty = this._post.y + Math.sin(angle) * 44;
    this.scene.physics.moveToObject(this, { x: tx, y: ty }, TOWER.GUARD_BEE_SPEED);

    // Auto-fire at nearest wasp in range
    if (time - this._lastFired < TOWER.GUARD_BEE_RATE) return;
    let nearest = null, nearestDist = TOWER.GUARD_BEE_RANGE;
    wasps.getChildren().forEach(w => {
      if (!w.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, w.x, w.y);
      if (d < nearestDist) { nearest = w; nearestDist = d; }
    });
    if (!nearest) return;
    stingers.add(new Stinger(this.scene, this.x, this.y, nearest.x, nearest.y, TOWER.GUARD_BEE_DAMAGE));
    this._lastFired = time;
  }
}
```

- [ ] **Step 4: Create GuardPost**

Create `src/towers/GuardPost.js`:

```js
import Phaser from 'phaser';
import GuardBee from '../entities/GuardBee.js';

export default class GuardPost extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'guard-post');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.towerType = 'guard';
    this._guard = new GuardBee(scene, x, y, this);
  }

  get guard() { return this._guard; }
}
```

- [ ] **Step 5: Commit**

```
git add src/towers/StingerTurret.js src/towers/ResinTrap.js src/entities/GuardBee.js src/towers/GuardPost.js
git commit -m "feat: StingerTurret, ResinTrap, GuardBee, GuardPost tower entities"
```

---

### Task 9: BuildMenu in-scene overlay

**Files:**
- Create: `src/ui/BuildMenu.js`

- [ ] **Step 1: Create BuildMenu**

Create `src/ui/BuildMenu.js`:

```js
import { TOWER, WORKER } from '../constants.js';

export default class BuildMenu {
  constructor(scene, onSelect) {
    this._scene = scene;
    this._onSelect = onSelect;

    const s = { fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };
    const hs = { ...s, fontSize: '20px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 380, 440, 240, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 270, 'BUILD  (B to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    const items = [
      { key: 'stinger-turret', label: `Stinger Turret  ${TOWER.STINGER_TURRET_COST}h` },
      { key: 'resin-trap',     label: `Resin Trap  ${TOWER.RESIN_TRAP_COST}h`         },
      { key: 'guard-post',     label: `Guard Post  ${TOWER.GUARD_POST_COST}h`         },
      { key: 'recruit-worker', label: `Recruit Worker  ${WORKER.COST}h`               },
    ];

    this._buttons = items.map((item, i) => {
      const btn = scene.add.text(640, 310 + i * 36, item.label, s)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setInteractive();
      btn.on('pointerover',  () => btn.setColor('#ffffff'));
      btn.on('pointerout',   () => btn.setColor('#ffd700'));
      btn.on('pointerdown',  () => { this._onSelect(item.key); this.hide(); });
      return btn;
    });

    this.hide();
  }

  show() {
    this._visible = true;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(true));
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(false));
  }

  get visible() { return this._visible; }
}
```

- [ ] **Step 2: Commit**

```
git add src/ui/BuildMenu.js
git commit -m "feat: BuildMenu in-scene overlay for towers and worker recruitment"
```

---

### Task 10: UpgradeMenu in-scene overlay

**Files:**
- Create: `src/ui/UpgradeMenu.js`

- [ ] **Step 1: Create UpgradeMenu**

Create `src/ui/UpgradeMenu.js`:

```js
const LABELS = {
  BEE_SPEED:        'Bee Speed      ',
  BEE_CAPACITY:     'Bee Capacity   ',
  BEE_STINGER_DMG:  'Stinger Damage ',
  BEE_STINGER_RATE: 'Fire Rate      ',
  BEE_HP:           'Bee HP         ',
  BEE_ARMOR:        'Bee Armor      ',
  HIVE_STORAGE:     'Hive Storage   ',
  HIVE_PRODUCTION:  'Honey Rate     ',
  HIVE_HP:          'Hive HP        ',
  HIVE_WORKERS:     'Recruit Worker ',
};

export default class UpgradeMenu {
  constructor(scene, upgrades, resources, onBuy) {
    this._scene = scene;
    this._onBuy = onBuy;

    const s = { fontSize: '15px', color: '#ffd700', stroke: '#000', strokeThickness: 2, fontFamily: 'monospace' };
    const hs = { ...s, fontSize: '19px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 390, 500, 360, 0x000000, 0.88)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 220, 'UPGRADES  (U to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    this._rows = Object.keys(LABELS).map((key, i) => {
      const row = scene.add.text(430, 252 + i * 30, '', s)
        .setScrollFactor(0).setDepth(201).setInteractive();
      row.on('pointerover',  () => { if (row._canBuy) row.setColor('#ffffff'); });
      row.on('pointerout',   () => { if (row._canBuy) row.setColor('#ffd700'); });
      row.on('pointerdown',  () => { if (row._canBuy) this._onBuy(key); });
      row._key = key;
      row._canBuy = false;
      return row;
    });

    this.refresh(upgrades, resources);
    this.hide();
  }

  refresh(upgrades, resources) {
    const honey = resources.getHoney();
    this._rows.forEach(row => {
      const key = row._key;
      const lvl = upgrades.getLevel(key);
      const cost = upgrades.getCost(key);
      const costStr = cost !== null ? `${cost}h` : 'MAX';
      row.setText(`${LABELS[key]}  Lv${lvl}/5  ${costStr}`);
      row._canBuy = cost !== null && honey >= cost;
      row.setColor(row._canBuy ? '#ffd700' : '#888888');
    });
  }

  show() {
    this._visible = true;
    [this._bg, this._title, ...this._rows].forEach(o => o.setVisible(true));
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._rows].forEach(o => o.setVisible(false));
  }

  get visible() { return this._visible; }
}
```

- [ ] **Step 2: Commit**

```
git add src/ui/UpgradeMenu.js
git commit -m "feat: UpgradeMenu in-scene overlay showing all 10 upgrade keys"
```

---

### Task 11: Update HUD to show worker count

**Files:**
- Modify: `src/ui/HUD.js`

- [ ] **Step 1: Add worker count text in constructor**

Open `src/ui/HUD.js`. After `this._waveText = ...` (line 16), add:

```js
    this._workerText = scene.add.text(16, 146, '', s).setScrollFactor(0).setDepth(100);
```

- [ ] **Step 2: Update `update()` signature and body**

Change the method signature from `update(elapsed, waveNumber)` to:

```js
  update(elapsed, waveNumber, workerCount) {
```

Add at the end of the method body:

```js
    this._workerText.setText(`Workers: ${workerCount}`);
```

- [ ] **Step 3: Commit**

```
git add src/ui/HUD.js
git commit -m "feat: HUD shows live worker bee count"
```

---

### Task 12: Wire everything in GameScene

This task integrates all Plan 2 systems into `src/scenes/GameScene.js`. Apply changes in order.

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Update imports at the top of GameScene.js**

Replace the existing import block with:

```js
import Phaser from 'phaser';
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER } from '../constants.js';
import Flower from '../entities/Flower.js';
import Hive from '../entities/Hive.js';
import ResourceManager from '../systems/ResourceManager.js';
import PollinationSystem from '../systems/PollinationSystem.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import PlayerBee from '../entities/PlayerBee.js';
import Stinger from '../entities/Stinger.js';
import WorkerBee from '../entities/WorkerBee.js';
import WaveManager from '../systems/WaveManager.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';
import StingerTurret from '../towers/StingerTurret.js';
import ResinTrap from '../towers/ResinTrap.js';
import GuardPost from '../towers/GuardPost.js';
import HUD from '../ui/HUD.js';
import BuildMenu from '../ui/BuildMenu.js';
import UpgradeMenu from '../ui/UpgradeMenu.js';
```

- [ ] **Step 2: Add physics groups for workers in create()**

In `create()`, after `this.stingers = this.physics.add.group();`, add:

```js
    this.workers = this.physics.add.group();
    this._towerList = [];
```

- [ ] **Step 3: Save the conversion timer for HIVE_PRODUCTION upgrade**

Find:

```js
    this.time.addEvent({
      delay: HIVE.SAP_CONVERSION_INTERVAL,
      callback: () => this.resources.convertSap(1),
      loop: true,
    });
```

Replace with:

```js
    this._conversionTimer = this.time.addEvent({
      delay: HIVE.SAP_CONVERSION_INTERVAL,
      callback: () => this.resources.convertSap(1),
      loop: true,
    });
```

- [ ] **Step 4: Add UpgradeManager after resources**

After `this.resources = new ResourceManager(...)`, add:

```js
    this.upgrades = new UpgradeManager();
```

- [ ] **Step 5: Update the hunter-vs-player overlap to apply armor to SAP_STEAL**

Find the sap-steal line inside the hunter overlap callback:

```js
        this.resources.stealSap('player', WASP.SAP_STEAL);
```

Replace with:

```js
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
```

- [ ] **Step 6: Add build and upgrade menu keyboard keys**

At the end of `create()`, before `this.hud = new HUD(...)`, add:

```js
    this._bKey = this.input.keyboard.addKey('B');
    this._uKey = this.input.keyboard.addKey('U');
    this._placing = null;
    this._ghost = null;

    this.buildMenu = new BuildMenu(this, (key) => {
      if (key === 'recruit-worker') {
        this._recruitWorker();
      } else {
        this._enterPlacementMode(key);
      }
    });

    this.upgradeMenu = new UpgradeMenu(this, this.upgrades, this.resources, (key) => {
      if (this.upgrades.purchase(key, this.resources)) {
        this._applyUpgrade(key);
        this.upgradeMenu.refresh(this.upgrades, this.resources);
      }
    });
```

- [ ] **Step 7: Replace the HUD line to pass workerCount**

Find:

```js
    this.hud = new HUD(this, this.resources, this.hive, this.player);
```

Replace with:

```js
    this.hud = new HUD(this, this.resources, this.hive, this.player);
    // Note: workerCount is passed dynamically in update()
```

(The constructor signature of HUD didn't change — workerCount is a per-frame value passed to `hud.update()`.)

- [ ] **Step 8: Update the update() method**

Replace the entire `update(time, delta)` method:

```js
  update(time, delta) {
    const workerCount = this.workers.getChildren().filter(w => w.alive).length;
    if (this.hud) this.hud.update(time, this.waveManager.getWaveNumber(), workerCount);

    this.pollination.update(time);
    if (this.player.alive) this.player.update(time, delta);

    this.wasps.getChildren().forEach(w => w.update(time));

    this.workers.getChildren().forEach(w => {
      if (w.alive) w.update(time, delta, this.resources);
    });

    this._towerList.forEach(tower => {
      if (tower.towerType === 'stinger') tower.update(time, this.wasps, this.stingers);
      else if (tower.towerType === 'resin')  tower.update(time, this.wasps);
      else if (tower.towerType === 'guard')  tower.guard.update(time, this.wasps, this.stingers);
    });

    this._checkWorkerHunterCollisions(time);

    if (Phaser.Input.Keyboard.JustDown(this._bKey)) {
      if (this.upgradeMenu.visible) this.upgradeMenu.hide();
      if (this.buildMenu.visible) this.buildMenu.hide();
      else this.buildMenu.show();
    }
    if (Phaser.Input.Keyboard.JustDown(this._uKey)) {
      if (this.buildMenu.visible) this.buildMenu.hide();
      if (this.upgradeMenu.visible) this.upgradeMenu.hide();
      else {
        this.upgradeMenu.refresh(this.upgrades, this.resources);
        this.upgradeMenu.show();
      }
    }

    const wave = this.waveManager.update(time);
    if (wave) this._spawnWave(wave);
  }
```

- [ ] **Step 9: Add _checkWorkerHunterCollisions() method**

Add after the `_edgePoint()` method:

```js
  _checkWorkerHunterCollisions(time) {
    this.wasps.getChildren().forEach(wasp => {
      if (!wasp.active || wasp.waspType !== 'hunter') return;
      this.workers.getChildren().forEach(worker => {
        if (!worker.active || !worker.alive) return;
        const dist = Phaser.Math.Distance.Between(wasp.x, wasp.y, worker.x, worker.y);
        if (dist > 20) return;
        if (time - wasp.lastHit < WASP.HIT_COOLDOWN) return;
        wasp.lastHit = time;
        if (worker._sap > 0) {
          worker._sap = Math.max(0, worker._sap - WASP.SAP_STEAL);
        } else {
          worker.takeDamage(WASP.DAMAGE);
        }
      });
    });
  }
```

- [ ] **Step 10: Add _recruitWorker() method**

Add after `_checkWorkerHunterCollisions`:

```js
  _recruitWorker() {
    if (!this.resources.spendHoney(WORKER.COST)) return;
    const w = new WorkerBee(this, this.hiveX, this.hiveY);
    w.init(this.hive, this.flowers);
    this.workers.add(w);
  }
```

- [ ] **Step 11: Add tower placement methods**

Add after `_recruitWorker`:

```js
  _enterPlacementMode(towerKey) {
    this._placing = towerKey;
    this._ghost = this.add.image(0, 0, towerKey).setAlpha(0.5).setDepth(50);
    this.input.on('pointermove', this._onPlacementMove, this);
    this.input.once('pointerdown', this._onPlacementPlace, this);
    this.input.keyboard.addKey('ESC').once('down', () => this._cancelPlacement());
  }

  _onPlacementMove(pointer) {
    if (!this._ghost) return;
    const wx = this.cameras.main.scrollX + pointer.x;
    const wy = this.cameras.main.scrollY + pointer.y;
    this._ghost.setPosition(wx, wy);
  }

  _onPlacementPlace(pointer) {
    const wx = this.cameras.main.scrollX + pointer.x;
    const wy = this.cameras.main.scrollY + pointer.y;
    this._placeTower(this._placing, wx, wy);
    this._cancelPlacement();
  }

  _cancelPlacement() {
    if (this._ghost) { this._ghost.destroy(); this._ghost = null; }
    this._placing = null;
    this.input.off('pointermove', this._onPlacementMove, this);
  }

  _placeTower(key, x, y) {
    const costs = {
      'stinger-turret': TOWER.STINGER_TURRET_COST,
      'resin-trap':     TOWER.RESIN_TRAP_COST,
      'guard-post':     TOWER.GUARD_POST_COST,
    };
    if (!this.resources.spendHoney(costs[key])) return;
    let tower;
    if (key === 'stinger-turret') tower = new StingerTurret(this, x, y);
    else if (key === 'resin-trap') tower = new ResinTrap(this, x, y);
    else if (key === 'guard-post') tower = new GuardPost(this, x, y);
    if (tower) this._towerList.push(tower);
  }
```

- [ ] **Step 12: Add _applyUpgrade() method**

Add after `_placeTower`:

```js
  _applyUpgrade(key) {
    const lvl = this.upgrades.getLevel(key);
    switch (key) {
      case 'BEE_SPEED':
        this.player._speed = BEE.SPEED + lvl * 20;
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
        this._recruitWorker();
        break;
    }
  }
```

- [ ] **Step 13: Run all tests**

Run: `npx vitest run`

Expected: all tests pass (ResourceManager + WaveManager + PollinationSystem + UpgradeManager).

- [ ] **Step 14: Run the dev server and test manually**

Run: `npm run dev`

**Golden-path checklist:**
1. Start a game. HUD shows `Workers: 0`.
2. Press **B** — Build menu appears. Press **B** again — it closes.
3. Open build menu, click **Stinger Turret**. Ghost turret sprite follows the cursor. Click to place. Turret appears on the map. It should fire stingers at nearby wasps when a wave arrives.
4. Open build menu, click **Recruit Worker** (costs 30 honey — you may need to collect sap first). `Workers: 1` appears in HUD. Worker bee flies to a flower and returns sap to hive.
5. Open build menu, click **Resin Trap**. Place near a spawn edge. When wasps arrive they move noticeably slower for 3 seconds.
6. Open build menu, click **Guard Post**. A guard bee orbits the post and fires at nearby wasps.
7. Press **U** — Upgrade menu appears. Rows are grey (no honey yet). After collecting honey: rows turn gold. Click a row to buy. Level counter increments.
8. Buy **Bee Speed** — bee visibly moves faster. Buy **Hive Workers** — worker count increments.
9. Take damage from hunters with and without buying **Bee Armor** — armor reduces damage.
10. A hunter near a worker should steal the worker's sap before reducing its HP.

Kill the server when done.

- [ ] **Step 15: Commit**

```
git add src/scenes/GameScene.js
git commit -m "feat: wire workers, towers, build/upgrade menus, and upgrade application into GameScene"
```

---

## Known Limitations (addressed in later plans)

- Upgrades reset on each run (Plan 4 adds LocalStorage meta-progression).
- No visual feedback when purchase fails due to insufficient honey.
- Tower placement allows stacking towers on the same tile.
- Guard bees cannot be killed by wasps (intentionally simplified for Plan 2).
- Upgrade menu doesn't auto-refresh honey values — reopen with U to see updated affordability.
