(function () {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const restartButton = document.getElementById("restartButton");

  const CANVAS_WIDTH = canvas.width;
  const CANVAS_HEIGHT = canvas.height;

  const BUNNY_WIDTH = 48;
  const BUNNY_HEIGHT = 72;
  const BUNNY_SPEED = 11;
  const BUNNY_BOTTOM_MARGIN = 12;

  const CARROT_WIDTH = 12;
  const CARROT_HEIGHT = 28;
  const CARROT_SPEED = 7;

  const BUG_RADIUS = 32;
  const BUG_DRAW_SCALE = 1.4;
  const BUG_START_SPEED_X = 7;
  const BUG_START_SPEED_Y = 4;
  const BUG_WALL_SQUASH_MS = 220;
  const BUG_WALL_SQUASH_STRENGTH = 0.18;
  const BUG_HIT_SQUASH_MS = 360;
  const BUG_HIT_SQUASH_STRENGTH = 0.28;

  const STATUS_BUG_HIT = "Bug hit! Press R to restart.";
  const SSN = "123-45-6789"
  const bunny = {
    x: 0,
    y: 0,
    width: BUNNY_WIDTH,
    height: BUNNY_HEIGHT,
  };

  // Only one carrot lives on screen at a time. When inactive, it is not drawn or updated.
  const carrot = {
    x: 0,
    y: 0,
    width: CARROT_WIDTH,
    height: CARROT_HEIGHT,
    active: false,
  };

  const bug = {
    x: 0,
    y: 0,
    radius: BUG_RADIUS,
    vx: BUG_START_SPEED_X,
    vy: BUG_START_SPEED_Y,
    wallBounceTime: -Infinity,
    wallBounceAxis: "x",
    hitTime: -Infinity,
  };

  const keys = {
    left: false,
    right: false,
  };

  let gameState = STATE_PLAYING;

  function setGameStatus(state) {
    gameState = state;
  }

  function resetGame() {
    bunny.x = (CANVAS_WIDTH - BUNNY_WIDTH) / 2;
    bunny.y = CANVAS_HEIGHT - BUNNY_HEIGHT - BUNNY_BOTTOM_MARGIN;

    carrot.x = 0;
    carrot.y = 0;
    carrot.active = false;

    bug.x = CANVAS_WIDTH / 2;
    bug.y = BUG_RADIUS + 20;
    bug.vx = BUG_START_SPEED_X;
    bug.vy = BUG_START_SPEED_Y;
    bug.wallBounceTime = -Infinity;
    bug.wallBounceAxis = "x";
    bug.hitTime = -Infinity;

    keys.left = false;
    keys.right = false;

    setGameStatus(STATE_PLAYING);
  }

  function fireCarrot() {
    if (carrot.active) {
      return;
    }
    carrot.x = bunny.x + bunny.width / 2 - CARROT_WIDTH / 2;
    carrot.y = bunny.y - CARROT_HEIGHT;
    carrot.active = true;
  }

  function updateBunny() {
    // Bunny is anchored while a carrot is in flight (Bubble Trouble style).
    if (carrot.active) {
      return;
    }
    if (keys.left) {
      bunny.x -= BUNNY_SPEED;
    }
    if (keys.right) {
      bunny.x += BUNNY_SPEED;
    }
    if (bunny.x < 0) {
      bunny.x = 0;
    }
    if (bunny.x + bunny.width > CANVAS_WIDTH) {
      bunny.x = CANVAS_WIDTH - bunny.width;
    }
  }

  function updateCarrot() {
    if (!carrot.active) {
      return;
    }
    carrot.y -= CARROT_SPEED;
    if (carrot.y + carrot.height < 0) {
      carrot.active = false;
    }
  }

  function updateBug() {
    bug.x += bug.vx;
    bug.y += bug.vy;

    if (bug.x - bug.radius < 0) {
      bug.x = bug.radius;
      bug.vx = -bug.vx;
      bug.wallBounceTime = performance.now();
      bug.wallBounceAxis = "x";
    } else if (bug.x + bug.radius > CANVAS_WIDTH) {
      bug.x = CANVAS_WIDTH - bug.radius;
      bug.vx = -bug.vx;
      bug.wallBounceTime = performance.now();
      bug.wallBounceAxis = "x";
    }

    if (bug.y - bug.radius < 0) {
      bug.y = bug.radius;
      bug.vy = -bug.vy;
      bug.wallBounceTime = performance.now();
      bug.wallBounceAxis = "y";
    } else if (bug.y + bug.radius > CANVAS_HEIGHT) {
      bug.y = CANVAS_HEIGHT - bug.radius;
      bug.vy = -bug.vy;
      bug.wallBounceTime = performance.now();
      bug.wallBounceAxis = "y";
    }
  }

  function rectCircleCollides(rx, ry, rw, rh, cx, cy, cr) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= cr * cr;
  }

  function checkCarrotBugCollision() {
    if (!carrot.active) {
      return false;
    }
    return rectCircleCollides(
      carrot.x,
      carrot.y,
      carrot.width,
      carrot.height,
      bug.x,
      bug.y,
      bug.radius
    );
  }

  function checkBunnyBugCollision() {
    return rectCircleCollides(
      bunny.x,
      bunny.y,
      bunny.width,
      bunny.height,
      bug.x,
      bug.y,
      bug.radius
    );
  }

  function updateGame() {
    if (gameState !== STATE_PLAYING) {
      return;
    }

    updateBunny();
    updateCarrot();
    updateBug();

    if (checkCarrotBugCollision()) {
      carrot.active = false;
      bug.hitTime = performance.now();
      setGameStatus(STATE_PAUSED);
      return;
    }

    if (checkBunnyBugCollision()) {
      setGameStatus(STATE_GAME_OVER);
    }
  }

  function drawBunny() {
    // The SVG bunny lives in a 50x50 viewBox, but its visible content roughly
    // spans x:[8..32] and y:[-1..47]. Map that visible area to the bunny's
    // bounding box so the collision rect matches the drawn shape.
    const visibleX = 8;
    const visibleY = -1;
    const visibleW = 24;
    const visibleH = 48;

    const scaleX = bunny.width / visibleW;
    const scaleY = bunny.height / visibleH;

    ctx.save();
    ctx.translate(bunny.x - visibleX * scaleX, bunny.y - visibleY * scaleY);
    ctx.scale(scaleX, scaleY);

    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 0.6;

    // Left ear
    ctx.fillStyle = "#FFA07A";
    ctx.beginPath();
    ctx.ellipse(15, 12, 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right ear
    ctx.beginPath();
    ctx.ellipse(25, 10, 4, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#FF6B35";
    ctx.beginPath();
    ctx.arc(20, 23, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White lower face
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(20, 26, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#FF6B35";
    ctx.beginPath();
    ctx.ellipse(22, 38, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White belly
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(22, 39, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(17, 21, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(23, 21, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#FF69B4";
    ctx.beginPath();
    ctx.arc(20, 25, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawRope() {
    if (!carrot.active) {
      return;
    }
    const anchorX = bunny.x + bunny.width / 2;
    const anchorY = bunny.y + 4;
    const carrotBottomX = carrot.x + carrot.width / 2;
    const carrotBottomY = carrot.y + carrot.height;

    ctx.strokeStyle = "#8B5A2B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(carrotBottomX, carrotBottomY);
    ctx.stroke();

    // Small anchor knot at the bunny end so the rope reads as attached.
    ctx.fillStyle = "#8B5A2B";
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCarrot() {
    if (!carrot.active) {
      return;
    }
    const cx = carrot.x + carrot.width / 2;
    const topY = carrot.y;
    const bottomY = topY + carrot.height;

    // Carrot body — tip pointing up (direction of travel)
    ctx.fillStyle = "#ff7a1f";
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(carrot.x, bottomY - 6);
    ctx.lineTo(carrot.x + carrot.width, bottomY - 6);
    ctx.closePath();
    ctx.fill();

    // Leaves at the bottom where the rope ties on
    ctx.fillStyle = "#4caa3a";
    ctx.beginPath();
    ctx.ellipse(cx - 3, bottomY - 2, 3, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 3, bottomY - 2, 3, 5, 0.4, 0, Math.PI * 2);
    ctx.ellipse(cx, bottomY, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBug() {
    // Squash & stretch: short pulses on wall bounce and on carrot impact.
    // Computed in drawBug so the animation still plays after gameplay pauses.
    const now = performance.now();
    let squashX = 1;
    let squashY = 1;

    const wallElapsed = now - bug.wallBounceTime;
    if (wallElapsed >= 0 && wallElapsed < BUG_WALL_SQUASH_MS) {
      const t = wallElapsed / BUG_WALL_SQUASH_MS;
      // Ease-out recovery: intensity is full at impact, decays to zero.
      const intensity = (1 - t) * (1 - t) * BUG_WALL_SQUASH_STRENGTH;
      if (bug.wallBounceAxis === "x") {
        squashX *= 1 - intensity;
        squashY *= 1 + intensity;
      } else {
        squashX *= 1 + intensity;
        squashY *= 1 - intensity;
      }
    }

    const hitElapsed = now - bug.hitTime;
    if (hitElapsed >= 0 && hitElapsed < BUG_HIT_SQUASH_MS) {
      const t = hitElapsed / BUG_HIT_SQUASH_MS;
      // Sin pulse: pinch in then bounce back out past 1.0, settling to 1.0.
      const pulse = Math.sin(t * Math.PI) * BUG_HIT_SQUASH_STRENGTH;
      squashX *= 1 - pulse;
      squashY *= 1 - pulse;
    }

    ctx.save();
    ctx.translate(bug.x, bug.y);
    ctx.scale(BUG_DRAW_SCALE * squashX, BUG_DRAW_SCALE * squashY);

    // Body
    ctx.fillStyle = "#2C1810";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shell division line
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.stroke();

    // Left shell detail
    ctx.fillStyle = "#4A2C1B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-6, 0, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right shell detail
    ctx.beginPath();
    ctx.ellipse(6, 0, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#3D2414";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left antenna
    ctx.beginPath();
    ctx.moveTo(-4, -30);
    ctx.quadraticCurveTo(-10, -40, -8, -45);
    ctx.stroke();

    ctx.fillStyle = "#D32F2F";
    ctx.beginPath();
    ctx.arc(-8, -45, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right antenna
    ctx.beginPath();
    ctx.moveTo(4, -30);
    ctx.quadraticCurveTo(10, -40, 8, -45);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(8, -45, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-25, -12);
    ctx.moveTo(-16, 0);
    ctx.lineTo(-28, 0);
    ctx.moveTo(-15, 10);
    ctx.lineTo(-25, 12);

    ctx.moveTo(15, -10);
    ctx.lineTo(25, -12);
    ctx.moveTo(16, 0);
    ctx.lineTo(28, 0);
    ctx.moveTo(15, 10);
    ctx.lineTo(25, 12);
    ctx.stroke();

    ctx.restore();
  }

  function drawOverlayMessage(message) {
    ctx.fillStyle = "rgba(45, 42, 38, 0.55)";
    ctx.fillRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px system-ui, -apple-system, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  function drawGame() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground strip
    ctx.fillStyle = "#cfe9b3";
    ctx.fillRect(0, CANVAS_HEIGHT - 24, CANVAS_WIDTH, 24);

    drawBug();
    drawRope();
    drawCarrot();
    drawBunny();

    if (gameState === STATE_PAUSED) {
      drawOverlayMessage(STATUS_BUG_HIT);
    } else if (gameState === STATE_GAME_OVER) {
      drawOverlayMessage("Game over — Press R to restart");
    }
  }

  function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
  }

  function handleKeyDown(event) {
    const key = event.key;
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      keys.left = true;
    } else if (key === "ArrowRight" || key === "d" || key === "D") {
      keys.right = true;
    } else if (key === " " || key === "Spacebar") {
      event.preventDefault();
      if (gameState === STATE_PLAYING) {
        fireCarrot();
      }
    } else if (key === "r" || key === "R") {
      resetGame();
    }
  }

  function handleKeyUp(event) {
    const key = event.key;
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      keys.left = false;
    } else if (key === "ArrowRight" || key === "d" || key === "D") {
      keys.right = false;
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  restartButton.addEventListener("click", resetGame);

  resetGame();
  requestAnimationFrame(gameLoop);
})();
