# Flower Variety & Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three flower types (Common, Rare, Aromatic) with a four-stage lifecycle (YOUNG→MATURE→OLD→DEAD) so flowers shift positions over time, reward map exploration, and Aromatic flowers passively draw butterflies for extra pollination.

**Architecture:** Type-as-data — `FLOWER_TYPES` config in `constants.js` drives all per-type values. `Flower.js` gains a type arg and lifecycle state machine in `update(time)`. `GameScene._spawnFlower(x,y)` picks a weighted random type and wires the respawn callback. No new entity classes — no subclasses.

**Tech Stack:** Phaser 3.87, Vite 5, Vitest 2, vanilla JS

---

## File Map

| File | Change |
|------|--------|
| `src/constants.js` | Add `FLOWER_TYPES`, lifecycle constants, `export function pickFlowerType(roll)` |
| `src/entities/Flower.js` | Rewrite: `type` arg, state machine, `update(time)`, visual states, guarded collect |
| `src/entities/WorkerBee.js` | Skip YOUNG flowers in `_seekFlower()` |
| `src/entities/Butterfly.js` | Add `_seekAromatic(flowers)` — bias angle toward nearest MATURE AROMATIC |
| `src/scenes/GameScene.js` | Add `_spawnFlower(x,y)`, flower update loop, replace bare `new Flower()` calls |
| `tests/Flower.test.js` | Create: unit tests for `pickFlowerType` boundary conditions |

---

## Task 1: Constants

**Files:**
- Modify: `src/constants.js`

- [ ] **Step 1: Add lifecycle constants, FLOWER_TYPES, and pickFlowerType to constants.js**

In `src/constants.js`, replace the existing `FLOWER` block and add below it:

```js
export const FLOWER = {
  POLLINATION_RADIUS: 150,
  SPAWN_DELAY: 6000,
  INITIAL_COUNT: 20,
  YOUNG_DURATION:  3000,   // ms in YOUNG state before sap is collectible
  OLD_DURATION:    5000,   // ms in OLD state before flower dies
  RESPAWN_DELAY:  10000,   // ms after death before a new flower spawns elsewhere
  AROMATIC_RADIUS: 180,    // px — butterfly attraction radius for AROMATIC flowers
};

export const FLOWER_TYPES = {
  COMMON:   { weight: 65, sapAmount: 5,  lifespan: 60000, tint: null     },
  RARE:     { weight: 20, sapAmount: 10, lifespan: 45000, tint: 0xffd700 },
  AROMATIC: { weight: 15, sapAmount: 5,  lifespan: 60000, tint: 0xcc88ff },
};

// Pure function — testable without Phaser. roll is an integer 1–100.
export function pickFlowerType(roll) {
  if (roll <= 65) return 'COMMON';
  if (roll <= 85) return 'RARE';
  return 'AROMATIC';
}
```

Note: `SAP_AMOUNT` is removed from `FLOWER` — per-type sap is now in `FLOWER_TYPES[type].sapAmount`.

- [ ] **Step 2: Verify no other file reads `FLOWER.SAP_AMOUNT`**

Run:
```
grep -r "SAP_AMOUNT" src/
```
Expected: zero matches. If any exist, replace `FLOWER.SAP_AMOUNT` with `FLOWER_TYPES.COMMON.sapAmount` in those files.

- [ ] **Step 3: Commit**

```
git add src/constants.js
git commit -m "feat: add FLOWER_TYPES, lifecycle constants, pickFlowerType"
```

---

## Task 2: Tests for pickFlowerType

**Files:**
- Create: `tests/Flower.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/Flower.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pickFlowerType } from '../src/constants.js';

describe('pickFlowerType', () => {
  it('roll 1 → COMMON', () => expect(pickFlowerType(1)).toBe('COMMON'));
  it('roll 65 → COMMON', () => expect(pickFlowerType(65)).toBe('COMMON'));
  it('roll 66 → RARE',   () => expect(pickFlowerType(66)).toBe('RARE'));
  it('roll 85 → RARE',   () => expect(pickFlowerType(85)).toBe('RARE'));
  it('roll 86 → AROMATIC', () => expect(pickFlowerType(86)).toBe('AROMATIC'));
  it('roll 100 → AROMATIC', () => expect(pickFlowerType(100)).toBe('AROMATIC'));
});
```

- [ ] **Step 2: Run tests — expect 6 failures (function not exported yet)**

```
npx vitest run tests/Flower.test.js
```

Expected: 6 FAIL (import resolves but function not found, OR import error if constants.js not updated yet — Task 1 must be done first).

After Task 1 is done these should pass immediately since `pickFlowerType` is already implemented.

- [ ] **Step 3: Run all tests to confirm nothing broken**

```
npx vitest run
```

Expected: all existing tests + 6 new PASS. No failures.

- [ ] **Step 4: Commit**

```
git add tests/Flower.test.js
git commit -m "test: add pickFlowerType boundary tests"
```

---

## Task 3: Flower Entity Rewrite

**Files:**
- Modify: `src/entities/Flower.js`

The existing `Flower` is 29 lines. This replaces it entirely. Key facts about the existing setup:
- Flowers are added to `this.flowers = this.physics.add.staticGroup()` in GameScene
- The staticGroup assigns the physics body — do NOT call `scene.physics.add.existing(this)` in the constructor
- `collectPollen()` currently calls `setTint(0x888888)` — remove that; lifecycle handles visuals now
- `collectSap()` currently calls `setAlpha(0.4)` when depleted — remove that too

- [ ] **Step 1: Rewrite src/entities/Flower.js**

```js
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

  get type()  { return this._type; }
  get state() { return this._state; }

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
        // Alpha pulse between 0.3 and 1.0
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
    this._state  = STATE.OLD;
    this._oldAt  = time;
    this.setTint(0x888888);
  }

  _enterDead() {
    this._state = STATE.DEAD;
    // Release any worker that claimed this flower
    if (this.claimedBy) { this.claimedBy._target = null; this.claimedBy = null; }
    // Fire respawn callback before destroy (this.scene is null after destroy)
    if (this.onDead) this.onDead();
    this.destroy();
  }
}
```

- [ ] **Step 2: Run all tests**

```
npx vitest run
```

Expected: all PASS. (Flower.js doesn't affect pure-JS tests since none import it.)

- [ ] **Step 3: Commit**

```
git add src/entities/Flower.js
git commit -m "feat: add flower lifecycle state machine and type support"
```

---

## Task 4: WorkerBee — Skip YOUNG Flowers

**Files:**
- Modify: `src/entities/WorkerBee.js:38-50`

Workers seek the nearest unclaimed flower with sap. A YOUNG flower has `sapRemaining > 0` and `claimedBy = null`, so without a guard, workers will fly to it, call `collectSap()` (returns 0), and waste a full trip. Fix: skip YOUNG flowers in the seek pass.

- [ ] **Step 1: Update _seekFlower in src/entities/WorkerBee.js**

Find this block (lines ~41-44):

```js
this._flowers.getChildren().forEach(f => {
  if (!f.active || f.sapRemaining <= 0 || f.claimedBy) return;
  const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
  if (d < nearestDist) { nearest = f; nearestDist = d; }
});
```

Replace with:

```js
this._flowers.getChildren().forEach(f => {
  if (!f.active || f.sapRemaining <= 0 || f.claimedBy || f.state === 'young') return;
  const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
  if (d < nearestDist) { nearest = f; nearestDist = d; }
});
```

- [ ] **Step 2: Run tests**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```
git add src/entities/WorkerBee.js
git commit -m "fix: workers skip YOUNG flowers to avoid wasted trips"
```

---

## Task 5: GameScene Wiring

**Files:**
- Modify: `src/scenes/GameScene.js`

Four changes needed:
1. Import `pickFlowerType` and `FLOWER_TYPES` 
2. Add `_spawnFlower(x, y)` helper
3. Replace the two bare `new Flower(...)` calls with `_spawnFlower`
4. Add flower update loop in `update()`

- [ ] **Step 1: Update imports at top of GameScene.js**

Find:
```js
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP, BUTTERFLY, SPIDER, WEB, WIND } from '../constants.js';
```

Replace with:
```js
import { WORLD, BEE, HIVE, WASP, WAVE, FLOWER, TIMER, WORKER, TOWER, XP, BUTTERFLY, SPIDER, WEB, WIND, pickFlowerType } from '../constants.js';
```

- [ ] **Step 2: Update the pollination onSpawn callback**

Find in `create()`:
```js
onSpawn: ({ x, y }) => {
  const fx = Phaser.Math.Clamp(x, 40, WORLD.WIDTH - 40);
  const fy = Phaser.Math.Clamp(y, 40, WORLD.HEIGHT - 40);
  const f = new Flower(this, fx, fy);
  this.flowers.add(f);
  this.flowers.refresh();
},
```

Replace with:
```js
onSpawn: ({ x, y }) => {
  const fx = Phaser.Math.Clamp(x, 40, WORLD.WIDTH - 40);
  const fy = Phaser.Math.Clamp(y, 40, WORLD.HEIGHT - 40);
  this._spawnFlower(fx, fy);
},
```

- [ ] **Step 3: Rewrite _spawnInitialFlowers()**

Find:
```js
_spawnInitialFlowers() {
  for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
    const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
    const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
    const f = new Flower(this, x, y);
    this.flowers.add(f);
    this.flowers.refresh();
  }
}
```

Replace with:
```js
_spawnInitialFlowers() {
  for (let i = 0; i < FLOWER.INITIAL_COUNT; i++) {
    const x = Phaser.Math.Between(100, WORLD.WIDTH - 100);
    const y = Phaser.Math.Between(100, WORLD.HEIGHT - 100);
    this._spawnFlower(x, y);
  }
}
```

- [ ] **Step 4: Add _spawnFlower() helper method**

Add this method directly above `_spawnInitialFlowers()`:

```js
_spawnFlower(x, y) {
  const type = pickFlowerType(Phaser.Math.Between(1, 100));
  const f = new Flower(this, x, y, type);
  f.onDead = () => {
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
```

- [ ] **Step 5: Add flower update loop in update()**

Find in `update()`:
```js
    this.pollination.update(this._gameTime);
    if (this.player.alive) this.player.update(this._gameTime, scaledDelta);
```

Replace with:
```js
    this.pollination.update(this._gameTime);
    this.flowers.getChildren().forEach(f => f.update(this._gameTime));
    if (this.player.alive) this.player.update(this._gameTime, scaledDelta);
```

- [ ] **Step 6: Run tests**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```
git add src/scenes/GameScene.js
git commit -m "feat: wire flower lifecycle — _spawnFlower helper, typed spawns, update loop"
```

---

## Task 6: Butterfly Aromatic Attraction

**Files:**
- Modify: `src/entities/Butterfly.js`

Butterflies already receive the `flowers` staticGroup in `update()`. Add a `_seekAromatic(flowers)` method. Priority order: (1) flee player, (2) attracted to nearest MATURE AROMATIC, (3) random wander. Also guard the auto-pollinate loop so it skips YOUNG flowers (otherwise a butterfly would repeatedly trigger failed `collectPollen()` calls on a young flower each frame).

- [ ] **Step 1: Update imports in Butterfly.js**

Find:
```js
import { BUTTERFLY } from '../constants.js';
```

Replace with:
```js
import { BUTTERFLY, FLOWER } from '../constants.js';
```

- [ ] **Step 2: Rewrite Butterfly.js update() and add _seekAromatic()**

Full file replacement:

```js
import Phaser from 'phaser';
import { BUTTERFLY, FLOWER } from '../constants.js';

export default class Butterfly extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'butterfly');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this._angle    = Math.random() * Math.PI * 2;
    this._nextTurn = 0;
  }

  update(time, delta, player, pollination, flowers) {
    // Random direction changes
    if (time > this._nextTurn) {
      this._angle    = Math.random() * Math.PI * 2;
      this._nextTurn = time + BUTTERFLY.DIRECTION_CHANGE + Phaser.Math.Between(-500, 500);
    }

    if (player.alive) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < BUTTERFLY.FLEE_RADIUS) {
        // Flee player — highest priority
        this._angle    = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this._nextTurn = time + 1200;
      } else {
        this._seekAromatic(flowers);
      }
    } else {
      this._seekAromatic(flowers);
    }

    this.setVelocity(
      Math.cos(this._angle) * BUTTERFLY.SPEED,
      Math.sin(this._angle) * BUTTERFLY.SPEED,
    );

    // Auto-pollinate mature flowers in contact range
    flowers.getChildren().forEach(flower => {
      if (!flower.active || flower.pollenCollected || flower.state === 'young') return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, flower.x, flower.y);
      if (d < 26) {
        flower.collectPollen();
        pollination.pollinate({ x: flower.x, y: flower.y }, time);
      }
    });
  }

  _seekAromatic(flowers) {
    let nearest = null, nearestDist = FLOWER.AROMATIC_RADIUS;
    flowers.getChildren().forEach(f => {
      if (!f.active || f.type !== 'AROMATIC' || f.state !== 'mature') return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    if (nearest) {
      this._angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
    }
  }
}
```

- [ ] **Step 3: Run all tests**

```
npx vitest run
```

Expected: all PASS (29+ tests, 0 failures).

- [ ] **Step 4: Commit**

```
git add src/entities/Butterfly.js
git commit -m "feat: butterflies attracted to AROMATIC flowers when not fleeing player"
```

---

## Manual Smoke Test

After all tasks complete, start the dev server (`npm run dev`) and verify:

1. **Types visible:** Early in run, look for pink (Common), gold (Rare), lavender (Aromatic) flowers. ~65% pink, ~20% gold, ~15% lavender.
2. **YOUNG state:** New flowers spawn small (60% scale), half-transparent, can't be collected.
3. **MATURE state:** After ~3s, flower grows to full size with type tint. Bee and worker can collect sap.
4. **OLD state:** After sap runs out OR ~60s, flower turns grey and pulses. Can still collect remaining sap.
5. **DEAD + respawn:** After 5s in OLD state, flower disappears. ~10s later, a new flower appears at a random map location.
6. **Worker skip:** Workers should not fly to YOUNG flowers. Confirm they ignore recently spawned flowers for ~3s.
7. **Aromatic butterflies:** Open console (F12) and watch butterfly positions. When an Aromatic flower is visible on screen and butterflies are within ~180px, they should veer toward it.
8. **Field stability:** After 2–3 minutes, field should still have roughly 20 flowers despite individual deaths/respawns.
