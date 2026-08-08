import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ROADMAP } from "./roadmap-data.js";

const COLORS = {
  paper: 0x0b0e16,
  forest: 0x5fb8a6,
  accent: 0xe3c284,
  client: 0x7fa8d9,
  platform: 0xa390cf,
  line: 0x2c364f,
  ring: 0x4a5578,
  ink: 0xe9edf6,
  star: 0xcdd8f0,
  gymSoft: 0x16332e,
  clientSoft: 0x16243a,
  platformSoft: 0x231e3a,
  floor: 0x0e121e,
};

const OWN = {
  gym: { fill: COLORS.gymSoft, stroke: COLORS.forest },
  client: { fill: COLORS.clientSoft, stroke: COLORS.client },
  platform: { fill: COLORS.platformSoft, stroke: COLORS.platform },
  done: { fill: COLORS.accent, stroke: COLORS.accent },
};

const RADII = { 1: 2.35, 2: 3.5, 3: 4.65 };
const RING_Y = { 1: 0.42, 2: 0.0, 3: -0.38 };

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** @type {Map<string, { item: object, stint: object, kind: string }>} */
const itemIndex = new Map();
for (const item of ROADMAP.foundation.items) {
  itemIndex.set(item.id, { item, stint: ROADMAP.foundation, kind: "foundation" });
}
if (ROADMAP.pullForward) {
  for (const item of ROADMAP.pullForward.items) {
    itemIndex.set(item.id, { item, stint: ROADMAP.pullForward, kind: "pull-forward" });
  }
}
for (const stint of ROADMAP.stints) {
  for (const item of stint.items) {
    itemIndex.set(item.id, { item, stint, kind: "stint" });
  }
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const canvas = document.getElementById("c");
const viewport = document.getElementById("viewport");
const dockEl = document.getElementById("dock");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setClearColor(COLORS.paper, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
Object.assign(labelRenderer.domElement.style, {
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
});
viewport.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.paper);
scene.fog = new THREE.FogExp2(COLORS.paper, 0.024);

{
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();
}

// Distant starfield — sparse, dim, no twinkle
{
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Random point on a shell between radius 26 and 44
    const r = 26 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: COLORS.star,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      fog: false,
      depthWrite: false,
    }),
  );
  scene.add(stars);
}

const camera = new THREE.PerspectiveCamera(
  34,
  viewport.clientWidth / viewport.clientHeight,
  0.1,
  80,
);
const camStart = new THREE.Vector3(0.2, 9.5, 0.4);
const camRest = new THREE.Vector3(6.4, 5.1, 7.6);
camera.position.copy(reduceMotion ? camRest : camStart);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.048;
controls.enablePan = false;
controls.minDistance = 5.8;
controls.maxDistance = 13.5;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.46;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.28;
controls.target.set(0, 0.15, 0);
controls.enabled = reduceMotion;

// Lighting — cool starlight key with a faint warm counter
const hemi = new THREE.HemisphereLight(0x8fa7d4, 0x0b0e16, 0.4);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xf2ecdd, 1.0);
key.position.set(5.5, 10, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 24;
key.shadow.camera.left = -8;
key.shadow.camera.right = 8;
key.shadow.camera.top = 8;
key.shadow.camera.bottom = -8;
key.shadow.radius = 4;
key.shadow.bias = -0.0002;
scene.add(key);

const rim = new THREE.DirectionalLight(0x7fa8d9, 0.5);
rim.position.set(-6, 3, -4);
scene.add(rim);

const root = new THREE.Group();
scene.add(root);

/** Orbit groups rotate at slightly different rates */
const orbitGroups = [];

// Pedestal floor
{
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 6.55, 0.08, 96),
    new THREE.MeshPhysicalMaterial({
      color: COLORS.floor,
      roughness: 0.92,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.7,
    }),
  );
  floor.position.y = -0.72;
  floor.receiveShadow = true;
  root.add(floor);

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(6.48, 0.012, 8, 128),
    new THREE.MeshStandardMaterial({
      color: COLORS.ring,
      roughness: 0.5,
      metalness: 0.3,
    }),
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.675;
  root.add(lip);

  // Soft under-glow disc (not bloom — a flat translucent plate)
  const wash = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 64),
    new THREE.MeshBasicMaterial({
      color: COLORS.accent,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  wash.rotation.x = -Math.PI / 2;
  wash.position.y = -0.66;
  root.add(wash);
}

/** @type {THREE.Object3D[]} */
const pickables = [];
/** @type {Map<string, { mesh: THREE.Mesh, labelEl: HTMLElement, targetScale: number, hoverScale: number, mat: THREE.MeshPhysicalMaterial }>} */
const nodeRefs = new Map();
let selectedId = null;
let hoveredId = null;
/** @type {THREE.Group | null} */
let coreGroup = null;
/** @type {THREE.Mesh | null} */
let coreMesh = null;

function ownershipLabel(o) {
  if (o === "gym") return "Gym-owned";
  if (o === "client") return "Client-owned";
  if (o === "platform") return "Platform";
  if (o === "done") return "Shipped";
  return o;
}

function pulseDock() {
  dockEl.classList.remove("dock-in");
  void dockEl.offsetWidth;
  dockEl.classList.add("dock-in");
}

function setDock({ kicker, title, body, meta, exit, ownership }) {
  dockEl.dataset.ownership = ownership || "gym";
  document.getElementById("dock-kicker").textContent = kicker;
  document.getElementById("dock-title").textContent = title;
  document.getElementById("dock-body").textContent = body;

  const metaEl = document.getElementById("dock-meta");
  const exitEl = document.getElementById("dock-exit");

  if (meta && Object.keys(meta).length) {
    metaEl.hidden = false;
    metaEl.replaceChildren();
    for (const [k, v] of Object.entries(meta)) {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      row.append(dt, dd);
      metaEl.appendChild(row);
    }
  } else {
    metaEl.hidden = true;
    metaEl.replaceChildren();
  }

  if (exit) {
    exitEl.hidden = false;
    exitEl.textContent = `Exit: ${exit}`;
  } else {
    exitEl.hidden = true;
    exitEl.textContent = "";
  }

  pulseDock();
}

function selectFoundation() {
  selectedId = "foundation";
  syncSelectionScales();
  setDock({
    kicker: "Foundation · shipped",
    title: ROADMAP.foundation.title,
    body: ROADMAP.foundation.body,
    meta: {
      Modules: "M1 Identity · M2 Gym Org",
      Paths: "src/features/auth · src/features/gym-orgs",
      Status: "Done",
    },
    exit: null,
    ownership: "done",
  });
  focusTarget(new THREE.Vector3(0, 0.35, 0));
  resumeAutoRotateSoon(2200);
}

function selectItem(id) {
  const entry = itemIndex.get(id);
  if (!entry) return;
  const { item, stint, kind } = entry;
  selectedId = id;
  syncSelectionScales();

  setDock({
    kicker: kind === "foundation" ? "Foundation" : `${stint.label} · ${stint.title}`,
    title: `${item.num}  ${item.title}`,
    body: item.body,
    meta: {
      PRD: item.prd,
      Paths: item.paths,
      Ownership: ownershipLabel(item.ownership),
      Status: item.status === "done" ? "Shipped" : "Todo",
    },
    exit: kind === "stint" || kind === "pull-forward" ? stint.exit : null,
    ownership: item.status === "done" ? "done" : item.ownership,
  });

  const ref = nodeRefs.get(id);
  if (ref) {
    const p = new THREE.Vector3();
    ref.mesh.getWorldPosition(p);
    focusTarget(p);
  }
  resumeAutoRotateSoon(5000);
}

let focusAnim = null;
function focusTarget(worldPoint) {
  if (reduceMotion) {
    controls.target.copy(worldPoint.clone().setY(worldPoint.y * 0.35));
    return;
  }
  const from = controls.target.clone();
  const to = worldPoint.clone().multiplyScalar(0.22);
  to.y = lerp(0.1, worldPoint.y * 0.45, 0.6);
  focusAnim = { from, to, t: 0, dur: 0.85 };
  controls.autoRotate = false;
}

function resumeAutoRotateSoon(ms) {
  clearTimeout(resumeAutoRotateSoon._t);
  if (reduceMotion) return;
  resumeAutoRotateSoon._t = setTimeout(() => {
    if (intro.done) controls.autoRotate = true;
  }, ms);
}

function syncSelectionScales() {
  for (const [id, ref] of nodeRefs) {
    const on = id === selectedId;
    const hover = id === hoveredId;
    ref.labelEl.classList.toggle("is-selected", on);
    ref.targetScale = on ? 1.32 : hover ? 1.14 : 1;
    ref.mat.emissiveIntensity = on ? 0.85 : hover ? 0.45 : 0.2;
  }
  if (coreMesh) {
    const on = selectedId === "foundation";
    coreMesh.userData.targetScale = on ? 1.06 : hoveredId === "foundation" ? 1.03 : 1;
  }
}

// —— Core sculpture ——
{
  coreGroup = new THREE.Group();
  coreGroup.position.y = 0.15;

  coreMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 64, 48),
    new THREE.MeshPhysicalMaterial({
      color: COLORS.accent,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.55,
      clearcoatRoughness: 0.25,
      sheen: 0.35,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xfff2d8),
      emissive: new THREE.Color(COLORS.accent),
      emissiveIntensity: 0.28,
    }),
  );
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  coreMesh.userData = { id: "foundation", kind: "foundation", targetScale: 1 };
  coreGroup.add(coreMesh);

  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.022, 16, 96),
    new THREE.MeshPhysicalMaterial({
      color: COLORS.ring,
      roughness: 0.35,
      metalness: 0.45,
      clearcoat: 0.4,
    }),
  );
  equator.rotation.x = Math.PI / 2;
  equator.castShadow = true;
  coreGroup.add(equator);

  // Nested meridian — quiet elegance
  const meridian = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.01, 12, 96),
    new THREE.MeshStandardMaterial({
      color: COLORS.ring,
      roughness: 0.45,
      metalness: 0.3,
      transparent: true,
      opacity: 0.55,
    }),
  );
  meridian.rotation.y = Math.PI / 2;
  coreGroup.add(meridian);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 0.55, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a2134,
      roughness: 0.7,
      metalness: 0.1,
    }),
  );
  pedestal.position.y = -0.55;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  coreGroup.add(pedestal);

  const labelDiv = document.createElement("div");
  labelDiv.className = "label3d label-core";
  labelDiv.textContent = "CORE";
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 1.05, 0);
  coreGroup.add(label);

  root.add(coreGroup);
  pickables.push(coreMesh);
}

function makeRingMaterial(opacity = 1) {
  return new THREE.MeshPhysicalMaterial({
    color: COLORS.ring,
    roughness: 0.45,
    metalness: 0.35,
    clearcoat: 0.3,
    transparent: opacity < 1,
    opacity,
  });
}

function makeArc(radius, fraction, y, color) {
  const points = [];
  const segs = Math.max(12, Math.floor(80 * fraction));
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * fraction * Math.PI * 2 - Math.PI / 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  const geo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    segs,
    0.028,
    8,
    false,
  );
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      metalness: 0.15,
      clearcoat: 0.4,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.12,
    }),
  );
  mesh.position.y = y;
  mesh.castShadow = true;
  return mesh;
}

// —— Rings + nodes ——
for (const stint of ROADMAP.stints) {
  const r = RADII[stint.orbit];
  const y = RING_Y[stint.orbit];
  const group = new THREE.Group();
  group.position.y = y;
  group.userData.spin = 0.04 + stint.orbit * 0.012;
  orbitGroups.push(group);
  root.add(group);

  // Dual hairline rings
  const outer = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 12, 160), makeRingMaterial(0.85));
  outer.rotation.x = Math.PI / 2;
  outer.castShadow = true;
  group.add(outer);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(r - 0.08, 0.006, 8, 160),
    makeRingMaterial(0.35),
  );
  inner.rotation.x = Math.PI / 2;
  group.add(inner);

  const doneFrac =
    stint.items.filter((i) => i.status === "done").length / stint.items.length;
  if (doneFrac > 0) group.add(makeArc(r, doneFrac, 0.01, COLORS.accent));

  // Orbit index tick mark
  const tick = document.createElement("div");
  tick.className = "label3d label-orbit";
  tick.textContent = `ORBIT ${stint.orbit}`;
  const tickObj = new CSS2DObject(tick);
  tickObj.position.set(0, 0.02, -r);
  group.add(tickObj);

  const n = stint.items.length;
  const start = stint.orbit === 1 ? -0.4 : stint.orbit === 2 ? 0.25 : -0.15;
  const sweep = Math.PI * 1.72;

  stint.items.forEach((item, i) => {
    const angle = start + (sweep / Math.max(n - 1, 1)) * i;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const ownKey = item.status === "done" ? "done" : item.ownership;
    const own = OWN[ownKey];

    const node = new THREE.Group();
    node.position.set(x, 0, z);

    // Stem — connects node to ring plane
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8),
      new THREE.MeshStandardMaterial({
        color: own.stroke,
        roughness: 0.55,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
      }),
    );
    stem.position.y = -0.14;
    node.add(stem);

    const mat = new THREE.MeshPhysicalMaterial({
      color: own.fill,
      roughness: 0.32,
      metalness: 0.12,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      emissive: new THREE.Color(own.stroke),
      emissiveIntensity: 0.2,
    });

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 32, 24), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: item.id, kind: "stint" };
    node.add(mesh);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.195, 0.016, 10, 40),
      new THREE.MeshPhysicalMaterial({
        color: own.stroke,
        roughness: 0.4,
        metalness: 0.3,
        clearcoat: 0.35,
      }),
    );
    band.rotation.x = Math.PI / 2;
    mesh.add(band);

    if (ownKey === "client") {
      const dash = new THREE.Mesh(
        new THREE.TorusGeometry(0.235, 0.008, 8, 28),
        new THREE.MeshBasicMaterial({
          color: own.stroke,
          transparent: true,
          opacity: 0.55,
        }),
      );
      dash.rotation.x = Math.PI / 2;
      mesh.add(dash);
    }

    const labelDiv = document.createElement("div");
    labelDiv.className = "label3d";
    labelDiv.textContent = item.num;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 0.34, 0);
    mesh.add(label);

    group.add(node);
    pickables.push(mesh);
    nodeRefs.set(item.id, {
      mesh,
      labelEl: labelDiv,
      targetScale: 1,
      hoverScale: 1,
      mat,
    });
  });
}

// —— Interaction ——
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;

function ndcFromEvent(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickId() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  return hits.length ? hits[0].object.userData.id : null;
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDown = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  pointerDown = null;
  if (dx * dx + dy * dy > 16) return;

  ndcFromEvent(e);
  const id = pickId();
  if (!id || id === "foundation") selectFoundation();
  else selectItem(id);
});

renderer.domElement.addEventListener("pointermove", (e) => {
  ndcFromEvent(e);
  const id = pickId();
  if (id !== hoveredId) {
    hoveredId = id;
    syncSelectionScales();
  }
  renderer.domElement.style.cursor = id ? "pointer" : "grab";
});

function onResize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener("resize", onResize);

// Intro camera
const intro = {
  done: reduceMotion,
  t: 0,
  dur: 2.4,
};

const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (!intro.done) {
    intro.t += dt;
    const u = easeOutCubic(Math.min(1, intro.t / intro.dur));
    camera.position.lerpVectors(camStart, camRest, u);
    if (u >= 1) {
      intro.done = true;
      controls.enabled = true;
      if (!reduceMotion) controls.autoRotate = true;
      document.body.classList.add("ready");
    }
  }

  if (focusAnim) {
    focusAnim.t += dt;
    const u = easeOutCubic(Math.min(1, focusAnim.t / focusAnim.dur));
    controls.target.lerpVectors(focusAnim.from, focusAnim.to, u);
    if (u >= 1) focusAnim = null;
  }

  if (!reduceMotion) {
    for (const g of orbitGroups) {
      g.rotation.y += g.userData.spin * dt;
    }
    if (coreGroup) {
      coreGroup.rotation.y = t * 0.12;
      coreGroup.position.y = 0.15 + Math.sin(t * 0.65) * 0.035;
    }
  }

  for (const ref of nodeRefs.values()) {
    const s = lerp(ref.mesh.scale.x, ref.targetScale, 1 - Math.exp(-10 * dt));
    ref.mesh.scale.setScalar(s);
  }
  if (coreMesh) {
    const target = coreMesh.userData.targetScale ?? 1;
    const s = lerp(coreMesh.scale.x, target, 1 - Math.exp(-8 * dt));
    coreMesh.scale.setScalar(s);
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

selectFoundation();
if (reduceMotion) document.body.classList.add("ready");
tick();
