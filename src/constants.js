export const WORLD = {
  WIDTH: 2560,
  HEIGHT: 1440,
};

export const BEE = {
  SPEED: 200,
  HP: 5,
  SAP_CAPACITY: 10,
  STINGER_RATE: 800,         // ms between auto-fire shots
  STINGER_SPEED: 400,
  STINGER_DAMAGE: 1,
  STINGER_RANGE: 200,
  RESPAWN_COST: 20,
};

export const HIVE = {
  HP: 10,
  HONEY_STORAGE: 100,
  SAP_CONVERSION_RATE: 1,    // honey per sap unit
  SAP_CONVERSION_INTERVAL: 2000, // ms between conversions (converts 1 sap at a time)
};

export const WASP = {
  HUNTER_SPEED: 150,
  RAIDER_SPEED: 120,
  HP: 1,
  SAP_STEAL: 3,
  HONEY_STEAL: 5,
  DAMAGE: 1,
  HIT_COOLDOWN: 1000,        // ms between hits from same wasp
};

export const WAVE = {
  FIRST_WAVE_DELAY: 15000,
  WAVE_INTERVAL: 30000,
  BASE_COUNT: 3,
  COUNT_INCREMENT: 2,
};

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

export const TIMER = {
  RUN_DURATION: 600000,      // 10 minutes
};

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
  GUARD_POST_HP: 3,             // hits before guard post is destroyed
  GUARD_BEE_HP: 4,
  GUARD_BEE_SPEED: 130,
  GUARD_BEE_RANGE: 120,
  GUARD_BEE_DAMAGE: 1,
  GUARD_BEE_RATE: 900,         // ms between guard bee shots
};

export const UPGRADE = {
  MAX_LEVEL: 5,
};

export const XP = {
  BASE_REQ: 10,       // XP needed for level 2
  REQ_MULTIPLIER: 1.5, // How much requirement grows per level
  WASP_KILL: 2,       // XP dropped per wasp
};
export const BUTTERFLY = {
  SPEED: 60,
  COUNT: 4,              // spawned at run start
  FLEE_RADIUS: 150,      // runs from player if closer than this
  DIRECTION_CHANGE: 3000, // ms between random direction changes
  BOOST_RADIUS: 80,      // radius within which butterfly boosts nearby flowers
  POLLINATE_RADIUS: 50,  // radius for auto-pollination (was 26)
};

export const SPIDER = {
  SPEED: 45,
  COUNT: 3,              // spawned at run start
  WEB_PLACE_TIME: 5000,  // ms spider must dwell near a flower before placing a web
};

export const WEB = {
  RADIUS: 28,            // distance in px at which web catches an entity
  BREAK_TIME: 3000,      // ms of continuous contact before web snaps
  MIN_DISTANCE: 80,      // spiders won't place a new web closer than this to an existing one
  MAX_COUNT: 20,         // max webs on the map at once
};

export const WIND = {
  MAX_STRENGTH: 5,       // px/s maximum wind speed
  SHIFT_INTERVAL: 10000, // ms between wind direction/strength changes
  LERP_RATE: 0.004,      // per-frame lerp rate toward new wind target (~12s to fully shift)
};
