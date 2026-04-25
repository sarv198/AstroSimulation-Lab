/**
 * Starfield + dashboard UI + in-browser slingshot (mirrors slingshot/main.py).
 */

const STAR_COUNT = 220;

function seedStarfield(container) {
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = document.createElement("span");
    s.className = "star" + (Math.random() > 0.65 ? "" : " star--dim");
    const size = Math.random() > 0.92 ? 2.2 : Math.random() * 1.4 + 0.5;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.opacity = String(0.35 + Math.random() * 0.65);
    s.dataset.depth = (0.15 + Math.random() * 0.85).toFixed(3);
    frag.appendChild(s);
  }
  container.appendChild(frag);
}

function attachStarfieldParallax(starfield) {
  let mx = 0.5;
  let my = 0.5;
  let raf = 0;

  const tick = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const dx = (mx - 0.5) * 28;
      const dy = (my - 0.5) * 22;
      starfield.style.transform = `translate(${dx}px, ${dy}px)`;
      const stars = starfield.querySelectorAll(".star");
      stars.forEach((el) => {
        const d = parseFloat(el.dataset.depth || "0.5", 10);
        const ox = (mx - 0.5) * 40 * d;
        const oy = (my - 0.5) * 32 * d;
        el.style.transform = `translate(${ox}px, ${oy}px) scale(${1 + d * 0.08})`;
        if (Math.random() > 0.985) {
          el.style.opacity = String(0.4 + Math.random() * 0.6);
        }
      });
    });
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
      tick();
    },
    { passive: true }
  );

  starfield.addEventListener("pointerleave", () => {
    mx = 0.5;
    my = 0.5;
    tick();
  });
}

/* ---- Slingshot sim (constants match slingshot/main.py) ---- */

const WIDTH = 800;
const HEIGHT = 600;
const PLANET_MASS = 100;
const SHIP_MASS = 5;
const G_CONST = 5;
const PLANET_SIZE = 50;
const OBJ_SIZE = 5;
const VEL_SCALE = 100;

function createShip(location, mouse) {
  const [tX, tY] = location;
  const [mX, mY] = mouse;
  return {
    x: tX,
    y: tY,
    velX: (mX - tX) / VEL_SCALE,
    velY: (mY - tY) / VEL_SCALE,
    mass: SHIP_MASS,
  };
}

function moveShip(obj, planet) {
  const dx = planet.x - obj.x;
  const dy = planet.y - obj.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return;
  const force = (G_CONST * obj.mass * planet.mass) / (distance * distance);
  const acceleration = force / obj.mass;
  const angle = Math.atan2(dy, dx);
  obj.velX += acceleration * Math.cos(angle);
  obj.velY += acceleration * Math.sin(angle);
  obj.x += obj.velX;
  obj.y += obj.velY;
}

function runSlingshot(canvas, assetBase) {
  const ctx = canvas.getContext("2d");
  const planet = { x: WIDTH / 2, y: HEIGHT / 2, mass: PLANET_MASS };
  let objects = [];
  let tempObjPos = null;
  let mousePos = [0, 0];
  let bgReady = null;
  let planetImgReady = null;
  let active = true;
  let rafId = 0;

  const bg = new Image();
  bg.crossOrigin = "anonymous";
  const planetImg = new Image();
  planetImg.crossOrigin = "anonymous";

  bg.src = `${assetBase}/background.png`;
  planetImg.src = `${assetBase}/jupiter.png`;

  bg.onload = () => {
    bgReady = true;
  };
  bg.onerror = () => {
    bgReady = false;
  };
  planetImg.onload = () => {
    planetImgReady = true;
  };
  planetImg.onerror = () => {
    planetImgReady = false;
  };

  function drawPlanetFallback() {
    const g = ctx.createRadialGradient(
      planet.x - 12,
      planet.y - 12,
      4,
      planet.x,
      planet.y,
      PLANET_SIZE
    );
    g.addColorStop(0, "#f0d4a8");
    g.addColorStop(0.5, "#d2a468");
    g.addColorStop(1, "#6a4428");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, PLANET_SIZE, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame() {
    if (!active) return;
    if (bgReady === true) {
      ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
    } else if (bgReady === false) {
      ctx.fillStyle = "#0a0a1c";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } else {
      ctx.fillStyle = "#06060f";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (tempObjPos) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tempObjPos[0], tempObjPos[1]);
      ctx.lineTo(mousePos[0], mousePos[1]);
      ctx.stroke();
      ctx.fillStyle = "#ff3333";
      ctx.beginPath();
      ctx.arc(tempObjPos[0], tempObjPos[1], OBJ_SIZE, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const obj of objects) {
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, OBJ_SIZE, 0, Math.PI * 2);
      ctx.fill();
    }

    const ps = PLANET_SIZE * 2;
    if (planetImgReady === true) {
      ctx.drawImage(planetImg, planet.x - PLANET_SIZE, planet.y - PLANET_SIZE, ps, ps);
    } else {
      drawPlanetFallback();
    }

    const next = [];
    for (const obj of objects) {
      moveShip(obj, planet);
      const off =
        obj.x < 0 ||
        obj.x > WIDTH ||
        obj.y < 0 ||
        obj.y > HEIGHT;
      const collided =
        Math.hypot(obj.x - planet.x, obj.y - planet.y) <= PLANET_SIZE;
      if (!off && !collided) next.push(obj);
    }
    objects = next;

    if (active) rafId = requestAnimationFrame(frame);
  }

  function canvasCoords(ev) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return [(ev.clientX - rect.left) * scaleX, (ev.clientY - rect.top) * scaleY];
  }

  const onMove = (ev) => {
    mousePos = canvasCoords(ev);
  };
  const onClick = (ev) => {
    const p = canvasCoords(ev);
    if (tempObjPos) {
      objects.push(createShip(tempObjPos, p));
      tempObjPos = null;
    } else {
      tempObjPos = p;
    }
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onClick);

  rafId = requestAnimationFrame(frame);

  return () => {
    active = false;
    cancelAnimationFrame(rafId);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerdown", onClick);
    objects = [];
    tempObjPos = null;
  };
}

/* ---- Modal wiring ---- */

function main() {
  const starfield = document.getElementById("starfield");
  seedStarfield(starfield);
  attachStarfieldParallax(starfield);

  const modal = document.getElementById("slingshotModal");
  const canvas = document.getElementById("slingshotCanvas");
  let stopSim = null;

  const assetBase = "/slingshot-assets";

  document.querySelectorAll("[data-open='slingshot']").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      if (stopSim) stopSim();
      stopSim = runSlingshot(canvas, assetBase);
    });
  });

  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (stopSim) {
      stopSim();
      stopSim = null;
    }
  };

  modal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", close);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

main();
