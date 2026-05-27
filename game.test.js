"use strict";

// Tests for game.js PR changes:
//   - createBug() factory function
//   - splitBug() splitting logic
//   - findCarrotHitBug() (replaces single-bug checkCarrotBugCollision)
//   - checkBunnyBugCollision() (now iterates a bugs array)
//   - New state constants and status strings
//
// Because game.js is a browser IIFE that cannot be imported, this file
// re-declares only the constants and functions touched by the PR so they
// can be exercised as pure units under Node's built-in test runner.
//
// Run with: node --test game.test.js

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Re-declarations of PR-changed constants
// ---------------------------------------------------------------------------

const BUG_RADIUS = 32;
const BUG_START_SPEED_X = 7;
const BUG_START_SPEED_Y = 4;
const BUG_SPLIT_RATIO = 0.5;
const MAX_BUG_SPLITS = 2;

const STATUS_WIN = "All bugs cleared! Press R to restart";
const STATUS_GAME_OVER = "Game over — Press R to restart";

const STATE_PLAYING = "playing";
const STATE_WIN = "win";
const STATE_GAME_OVER = "gameOver";

// ---------------------------------------------------------------------------
// Re-declarations of PR-changed functions (verbatim from game.js)
// ---------------------------------------------------------------------------

function createBug(x, y, radius, vx, vy, generation) {
  return {
    x,
    y,
    radius,
    vx,
    vy,
    generation,
    wallBounceTime: -Infinity,
    wallBounceAxis: "x",
    hitTime: -Infinity,
  };
}

function splitBug(parent) {
  if (parent.generation >= MAX_BUG_SPLITS) {
    return [];
  }
  const childRadius = parent.radius * BUG_SPLIT_RATIO;
  const childGeneration = parent.generation + 1;
  const speedX = Math.max(Math.abs(parent.vx), BUG_START_SPEED_X);
  const popY = -Math.abs(parent.vy) - 1;
  return [
    createBug(parent.x, parent.y, childRadius, -speedX, popY, childGeneration),
    createBug(parent.x, parent.y, childRadius, speedX, popY, childGeneration),
  ];
}

function rectCircleCollides(rx, ry, rw, rh, cx, cy, cr) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

// findCarrotHitBug and checkBunnyBugCollision operate on shared state.
// We expose that state as plain objects so each test can configure it.

const carrot = { x: 0, y: 0, width: 12, height: 28, active: false };
const bugs = [];
const bunny = { x: 0, y: 0, width: 48, height: 72 };

function findCarrotHitBug() {
  if (!carrot.active) {
    return -1;
  }
  for (let i = 0; i < bugs.length; i += 1) {
    const bug = bugs[i];
    if (
      rectCircleCollides(
        carrot.x,
        carrot.y,
        carrot.width,
        carrot.height,
        bug.x,
        bug.y,
        bug.radius
      )
    ) {
      return i;
    }
  }
  return -1;
}

function checkBunnyBugCollision() {
  for (const bug of bugs) {
    if (
      rectCircleCollides(
        bunny.x,
        bunny.y,
        bunny.width,
        bunny.height,
        bug.x,
        bug.y,
        bug.radius
      )
    ) {
      return true;
    }
  }
  return false;
}

// Helper: reset shared state before each logical group
function resetState() {
  bugs.length = 0;
  carrot.active = false;
  carrot.x = 0;
  carrot.y = 0;
  bunny.x = 0;
  bunny.y = 0;
}

// ---------------------------------------------------------------------------
// createBug()
// ---------------------------------------------------------------------------

describe("createBug", () => {
  it("creates a bug object with all provided properties", () => {
    const bug = createBug(100, 200, 32, 7, 4, 0);
    assert.equal(bug.x, 100);
    assert.equal(bug.y, 200);
    assert.equal(bug.radius, 32);
    assert.equal(bug.vx, 7);
    assert.equal(bug.vy, 4);
    assert.equal(bug.generation, 0);
  });

  it("sets wallBounceTime to -Infinity", () => {
    const bug = createBug(0, 0, 32, 7, 4, 0);
    assert.equal(bug.wallBounceTime, -Infinity);
  });

  it("sets wallBounceAxis to 'x'", () => {
    const bug = createBug(0, 0, 32, 7, 4, 0);
    assert.equal(bug.wallBounceAxis, "x");
  });

  it("sets hitTime to -Infinity", () => {
    const bug = createBug(0, 0, 32, 7, 4, 0);
    assert.equal(bug.hitTime, -Infinity);
  });

  it("preserves negative velocity values", () => {
    const bug = createBug(50, 80, 16, -5, -3, 1);
    assert.equal(bug.vx, -5);
    assert.equal(bug.vy, -3);
  });

  it("creates independent objects on each call", () => {
    const a = createBug(0, 0, 32, 7, 4, 0);
    const b = createBug(0, 0, 32, 7, 4, 0);
    a.x = 999;
    assert.equal(b.x, 0);
  });

  it("supports generation values beyond 0", () => {
    const bug = createBug(0, 0, 16, 7, 4, 2);
    assert.equal(bug.generation, 2);
  });
});

// ---------------------------------------------------------------------------
// splitBug()
// ---------------------------------------------------------------------------

describe("splitBug", () => {
  it("returns empty array when generation equals MAX_BUG_SPLITS", () => {
    const parent = createBug(200, 100, BUG_RADIUS, 7, 4, MAX_BUG_SPLITS);
    const children = splitBug(parent);
    assert.deepEqual(children, []);
  });

  it("returns empty array when generation exceeds MAX_BUG_SPLITS", () => {
    const parent = createBug(200, 100, BUG_RADIUS, 7, 4, MAX_BUG_SPLITS + 1);
    const children = splitBug(parent);
    assert.deepEqual(children, []);
  });

  it("returns exactly 2 children when generation is below MAX_BUG_SPLITS", () => {
    const parent = createBug(200, 100, BUG_RADIUS, 7, 4, 0);
    const children = splitBug(parent);
    assert.equal(children.length, 2);
  });

  it("children inherit parent position", () => {
    const parent = createBug(123, 456, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(left.x, 123);
    assert.equal(left.y, 456);
    assert.equal(right.x, 123);
    assert.equal(right.y, 456);
  });

  it("child radius is halved (BUG_SPLIT_RATIO = 0.5)", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(left.radius, BUG_RADIUS * BUG_SPLIT_RATIO);
    assert.equal(right.radius, BUG_RADIUS * BUG_SPLIT_RATIO);
  });

  it("child generation is parent generation + 1", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(left.generation, 1);
    assert.equal(right.generation, 1);
  });

  it("generation-1 parent produces generation-2 children at MAX_BUG_SPLITS - 1", () => {
    const parent = createBug(0, 0, BUG_RADIUS / 2, 7, 4, MAX_BUG_SPLITS - 1);
    const children = splitBug(parent);
    assert.equal(children.length, 2);
    assert.equal(children[0].generation, MAX_BUG_SPLITS);
    assert.equal(children[1].generation, MAX_BUG_SPLITS);
  });

  it("children diverge: left has negative vx, right has positive vx", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.ok(left.vx < 0, `Expected left.vx < 0 but got ${left.vx}`);
    assert.ok(right.vx > 0, `Expected right.vx > 0 but got ${right.vx}`);
  });

  it("children have equal and opposite vx", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(left.vx, -right.vx);
  });

  it("child speedX uses parent.vx when it exceeds BUG_START_SPEED_X", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 15, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(right.vx, 15);
    assert.equal(left.vx, -15);
  });

  it("child speedX falls back to BUG_START_SPEED_X when parent.vx is smaller", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 2, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(right.vx, BUG_START_SPEED_X);
    assert.equal(left.vx, -BUG_START_SPEED_X);
  });

  it("child speedX uses abs(parent.vx) so negative vx still produces correct split", () => {
    const parent = createBug(0, 0, BUG_RADIUS, -10, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(right.vx, 10);
    assert.equal(left.vx, -10);
  });

  it("child vy is always negative (pops upward)", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.ok(left.vy < 0, `Expected left.vy < 0 but got ${left.vy}`);
    assert.ok(right.vy < 0, `Expected right.vy < 0 but got ${right.vy}`);
  });

  it("child popY = -(abs(parent.vy) + 1)", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    const expectedPopY = -(Math.abs(4) + 1);
    assert.equal(left.vy, expectedPopY);
    assert.equal(right.vy, expectedPopY);
  });

  it("child popY uses abs(parent.vy) so upward-moving parent still pops correctly", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, -8, 0);
    const [left] = splitBug(parent);
    assert.equal(left.vy, -(8 + 1));
  });

  it("children start with hitTime at -Infinity (from createBug)", () => {
    const parent = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [left, right] = splitBug(parent);
    assert.equal(left.hitTime, -Infinity);
    assert.equal(right.hitTime, -Infinity);
  });

  it("grandchildren radius is 1/4 of original BUG_RADIUS after two splits", () => {
    const gen0 = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const gen1Children = splitBug(gen0);
    const gen2Children = splitBug(gen1Children[0]);
    assert.equal(gen2Children[0].radius, BUG_RADIUS * 0.25);
  });

  it("generation-2 bugs produce no children (game-over lineage)", () => {
    // A generation-2 bug is at the split limit and should be destroyed
    const gen2 = createBug(0, 0, BUG_RADIUS * 0.25, 7, 4, 2);
    assert.deepEqual(splitBug(gen2), []);
  });
});

// ---------------------------------------------------------------------------
// findCarrotHitBug()
// ---------------------------------------------------------------------------

describe("findCarrotHitBug", () => {
  it("returns -1 when carrot is inactive", () => {
    resetState();
    bugs.push(createBug(100, 100, BUG_RADIUS, 7, 4, 0));
    carrot.active = false;
    carrot.x = 100;
    carrot.y = 100;
    assert.equal(findCarrotHitBug(), -1);
  });

  it("returns -1 when bugs array is empty", () => {
    resetState();
    carrot.active = true;
    carrot.x = 100;
    carrot.y = 100;
    assert.equal(findCarrotHitBug(), -1);
  });

  it("returns -1 when carrot does not overlap any bug", () => {
    resetState();
    carrot.active = true;
    carrot.x = 0;
    carrot.y = 0;
    bugs.push(createBug(500, 500, BUG_RADIUS, 7, 4, 0));
    assert.equal(findCarrotHitBug(), -1);
  });

  it("returns 0 when the first bug is hit", () => {
    resetState();
    carrot.active = true;
    // Place carrot directly on the bug centre
    carrot.x = 100 - carrot.width / 2;
    carrot.y = 100 - carrot.height / 2;
    bugs.push(createBug(100, 100, BUG_RADIUS, 7, 4, 0));
    assert.equal(findCarrotHitBug(), 0);
  });

  it("returns the correct index when a later bug is hit", () => {
    resetState();
    carrot.active = true;
    carrot.x = 400 - carrot.width / 2;
    carrot.y = 200 - carrot.height / 2;
    bugs.push(createBug(50, 50, BUG_RADIUS, 7, 4, 0));   // index 0 – far away
    bugs.push(createBug(400, 200, BUG_RADIUS, 7, 4, 0));  // index 1 – hit
    assert.equal(findCarrotHitBug(), 1);
  });

  it("returns the first matching index when multiple bugs overlap the carrot", () => {
    resetState();
    carrot.active = true;
    carrot.x = 200 - carrot.width / 2;
    carrot.y = 200 - carrot.height / 2;
    bugs.push(createBug(200, 200, BUG_RADIUS, 7, 4, 0));  // index 0 – hit
    bugs.push(createBug(200, 200, BUG_RADIUS, -7, 4, 0)); // index 1 – also hit
    assert.equal(findCarrotHitBug(), 0);
  });

  it("detects collision at bug boundary (just touching)", () => {
    resetState();
    carrot.active = true;
    const bugX = 200;
    const bugY = 200;
    // Place carrot so its right edge just reaches the bug centre
    carrot.x = bugX - carrot.width;
    carrot.y = bugY - carrot.height / 2;
    bugs.push(createBug(bugX, bugY, BUG_RADIUS, 7, 4, 0));
    // The carrot right edge is exactly at bug centre; since cr=32, this is
    // well inside the collision zone.
    assert.equal(findCarrotHitBug(), 0);
  });

  it("returns -1 when carrot is far to the right of all bugs", () => {
    resetState();
    carrot.active = true;
    carrot.x = 900;
    carrot.y = 100;
    bugs.push(createBug(100, 100, BUG_RADIUS, 7, 4, 0));
    assert.equal(findCarrotHitBug(), -1);
  });
});

// ---------------------------------------------------------------------------
// checkBunnyBugCollision()
// ---------------------------------------------------------------------------

describe("checkBunnyBugCollision", () => {
  it("returns false when bugs array is empty", () => {
    resetState();
    assert.equal(checkBunnyBugCollision(), false);
  });

  it("returns false when bunny does not overlap any bug", () => {
    resetState();
    bunny.x = 0;
    bunny.y = 500;
    bugs.push(createBug(400, 100, BUG_RADIUS, 7, 4, 0));
    assert.equal(checkBunnyBugCollision(), false);
  });

  it("returns true when bunny overlaps the only bug", () => {
    resetState();
    bunny.x = 100;
    bunny.y = 100;
    // Place bug centre inside the bunny rect
    bugs.push(createBug(bunny.x + bunny.width / 2, bunny.y + bunny.height / 2, BUG_RADIUS, 7, 4, 0));
    assert.equal(checkBunnyBugCollision(), true);
  });

  it("returns true when at least one bug overlaps (others do not)", () => {
    resetState();
    bunny.x = 100;
    bunny.y = 300;
    bugs.push(createBug(900, 50, BUG_RADIUS, 7, 4, 0)); // far away
    bugs.push(createBug(bunny.x + bunny.width / 2, bunny.y + bunny.height / 2, BUG_RADIUS, 7, 4, 0)); // overlaps
    assert.equal(checkBunnyBugCollision(), true);
  });

  it("returns false when multiple bugs are all away from bunny", () => {
    resetState();
    bunny.x = 0;
    bunny.y = 0;
    bugs.push(createBug(600, 400, BUG_RADIUS, 7, 4, 0));
    bugs.push(createBug(700, 400, BUG_RADIUS, -7, 4, 0));
    assert.equal(checkBunnyBugCollision(), false);
  });

  it("detects collision with a smaller (generation-1) child bug", () => {
    resetState();
    const childRadius = BUG_RADIUS * BUG_SPLIT_RATIO;
    bunny.x = 150;
    bunny.y = 150;
    bugs.push(createBug(bunny.x + bunny.width / 2, bunny.y + bunny.height / 2, childRadius, 7, 4, 1));
    assert.equal(checkBunnyBugCollision(), true);
  });

  it("returns false when bugs are present but carrot is inactive (no cross-contamination)", () => {
    resetState();
    bunny.x = 400;
    bunny.y = 400;
    bugs.push(createBug(0, 0, BUG_RADIUS, 7, 4, 0)); // nowhere near bunny
    carrot.active = false;
    assert.equal(checkBunnyBugCollision(), false);
  });
});

// ---------------------------------------------------------------------------
// State constants and status strings (new values introduced by PR)
// ---------------------------------------------------------------------------

describe("state constants", () => {
  it("STATE_PLAYING is 'playing'", () => {
    assert.equal(STATE_PLAYING, "playing");
  });

  it("STATE_WIN is 'win'", () => {
    assert.equal(STATE_WIN, "win");
  });

  it("STATE_GAME_OVER is 'gameOver'", () => {
    assert.equal(STATE_GAME_OVER, "gameOver");
  });

  it("STATE_WIN and STATE_GAME_OVER are distinct values", () => {
    assert.notEqual(STATE_WIN, STATE_GAME_OVER);
  });

  it("STATE_WIN and STATE_PLAYING are distinct values", () => {
    assert.notEqual(STATE_WIN, STATE_PLAYING);
  });

  it("STATUS_WIN contains restart instruction", () => {
    assert.ok(
      STATUS_WIN.toLowerCase().includes("restart"),
      `STATUS_WIN should mention restart: "${STATUS_WIN}"`
    );
  });

  it("STATUS_GAME_OVER contains restart instruction", () => {
    assert.ok(
      STATUS_GAME_OVER.toLowerCase().includes("restart"),
      `STATUS_GAME_OVER should mention restart: "${STATUS_GAME_OVER}"`
    );
  });

  it("STATUS_WIN mentions bugs cleared", () => {
    assert.ok(
      STATUS_WIN.toLowerCase().includes("bugs"),
      `STATUS_WIN should mention bugs: "${STATUS_WIN}"`
    );
  });

  it("STATUS_GAME_OVER mentions game over", () => {
    assert.ok(
      STATUS_GAME_OVER.toLowerCase().includes("game over"),
      `STATUS_GAME_OVER should contain 'game over': "${STATUS_GAME_OVER}"`
    );
  });
});

// ---------------------------------------------------------------------------
// splitBug integration: full-lineage scenario
// ---------------------------------------------------------------------------

describe("splitBug full lineage", () => {
  it("a generation-0 bug produces 4 grandchildren and then nothing", () => {
    const gen0 = createBug(200, 200, BUG_RADIUS, 7, 4, 0);
    const gen1 = splitBug(gen0);
    assert.equal(gen1.length, 2);

    const gen2_from_left = splitBug(gen1[0]);
    const gen2_from_right = splitBug(gen1[1]);
    assert.equal(gen2_from_left.length, 2);
    assert.equal(gen2_from_right.length, 2);

    // Gen-2 bugs are at the split limit and must not produce children
    for (const g2 of [...gen2_from_left, ...gen2_from_right]) {
      assert.deepEqual(splitBug(g2), []);
    }
  });

  it("total bugs count follows splitting pattern: 1 → 2 → 4 → 0 (destroyed)", () => {
    // Simulate a bugs array through sequential carrot hits
    const activeBugs = [createBug(200, 200, BUG_RADIUS, 7, 4, 0)];

    // Hit 1: generation-0 splits into 2
    const hit1 = activeBugs.splice(0, 1)[0];
    activeBugs.push(...splitBug(hit1));
    assert.equal(activeBugs.length, 2);

    // Hit 2: one generation-1 splits into 2 more
    const hit2 = activeBugs.splice(0, 1)[0];
    activeBugs.push(...splitBug(hit2));
    assert.equal(activeBugs.length, 3); // 1 remaining + 2 new

    // Hit 3: the other generation-1 splits into 2 more
    const hit3 = activeBugs.splice(0, 1)[0];
    activeBugs.push(...splitBug(hit3));
    assert.equal(activeBugs.length, 4); // 2 + 2 generation-2 bugs

    // Hit 4-7: each generation-2 bug is destroyed (no children)
    for (let i = activeBugs.length - 1; i >= 0; i--) {
      const removed = activeBugs.splice(i, 1)[0];
      activeBugs.push(...splitBug(removed)); // pushes nothing
    }
    assert.equal(activeBugs.length, 0);
  });

  it("child radius at each generation follows powers of BUG_SPLIT_RATIO", () => {
    const gen0 = createBug(0, 0, BUG_RADIUS, 7, 4, 0);
    const [gen1] = splitBug(gen0);
    assert.equal(gen1.radius, BUG_RADIUS * Math.pow(BUG_SPLIT_RATIO, 1));

    const [gen2] = splitBug(gen1);
    assert.equal(gen2.radius, BUG_RADIUS * Math.pow(BUG_SPLIT_RATIO, 2));
  });
});
