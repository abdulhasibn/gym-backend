import { ROADMAP } from './roadmap-data.js';


const CX = 320;
const CY = 320;
const RADII = { 1: 145, 2: 210, 3: 275 };
const OWN_STROKE = {
  gym: "#5fb8a6",
  client: "#7fa8d9",
  platform: "#a390cf",
  done: "#e3c284",
};
const OWN_FILL = {
  gym: "#122b28",
  client: "#14213a",
  platform: "#211d38",
  done: "#e3c284",
};

/** @type {Map<string, object>} */
const itemIndex = new Map();

function indexData() {
  for (const item of ROADMAP.foundation.items) {
    itemIndex.set(item.id, { item, stint: ROADMAP.foundation, kind: "foundation" });
  }
  for (const stint of ROADMAP.stints) {
    for (const item of stint.items) {
      itemIndex.set(item.id, { item, stint, kind: "stint" });
    }
  }
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function polar(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function progressFraction(items) {
  if (!items.length) return 0;
  const done = items.filter((i) => i.status === "done").length;
  return done / items.length;
}

function describeArc(r, fraction) {
  if (fraction <= 0) return "";
  if (fraction >= 1) {
    return `M ${CX} ${CY - r} A ${r} ${r} 0 1 1 ${CX - 0.01} ${CY - r}`;
  }
  const end = polar(fraction * 360, r);
  const large = fraction > 0.5 ? 1 : 0;
  return `M ${CX} ${CY - r} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function renderOrbit() {
  const rings = document.getElementById("orbit-rings");
  const progress = document.getElementById("orbit-progress");
  const core = document.getElementById("orbit-core");
  const nodes = document.getElementById("orbit-nodes");
  const spokes = document.getElementById("orbit-spokes");

  rings.replaceChildren();
  progress.replaceChildren();
  core.replaceChildren();
  nodes.replaceChildren();
  spokes.replaceChildren();

  for (const stint of ROADMAP.stints) {
    const r = RADII[stint.orbit];
    rings.appendChild(
      svgEl("circle", {
        cx: CX,
        cy: CY,
        r,
        fill: "none",
        stroke: "#39435f",
        "stroke-width": 1.25,
        class: "orbit-ring-path",
        opacity: 0.95,
      }),
    );

    const frac = progressFraction(stint.items);
    if (frac > 0) {
      const arc = svgEl("path", {
        d: describeArc(r, frac),
        fill: "none",
        stroke: "#e3c284",
        "stroke-width": 4,
        "stroke-linecap": "round",
        class: "progress-arc",
        "data-orbit": stint.orbit,
      });
      progress.appendChild(arc);
    }

    const labelPos = polar(215 + stint.orbit * 8, r);
    const label = svgEl("text", {
      x: labelPos.x,
      y: labelPos.y,
      fill: "#6f7994",
      "font-family": "IBM Plex Mono, monospace",
      "font-size": 10,
      "text-anchor": "middle",
      class: "orbit-label",
    });
    label.textContent = `ORBIT ${stint.orbit}`;
    rings.appendChild(label);
  }

  // Core
  core.appendChild(
    svgEl("circle", {
      cx: CX,
      cy: CY,
      r: 72,
      fill: "#e3c284",
      opacity: 0.06,
    }),
  );
  core.appendChild(
    svgEl("circle", {
      cx: CX,
      cy: CY,
      r: 54,
      fill: "#e3c284",
      stroke: "#f0d9a8",
      "stroke-width": 1.5,
      filter: "url(#soft-glow)",
      class: "core-disk",
      style: "cursor:pointer",
      id: "core-hit",
      tabindex: "0",
      role: "button",
      "aria-label": "Foundation — Auth and Gym Org shipped",
    }),
  );
  const coreTitle = svgEl("text", {
    x: CX,
    y: CY - 6,
    fill: "#1c1508",
    "font-family": "Space Grotesk, sans-serif",
    "font-size": 13,
    "font-weight": 700,
    "text-anchor": "middle",
  });
  coreTitle.textContent = "FOUNDATION";
  core.appendChild(coreTitle);
  const coreSub = svgEl("text", {
    x: CX,
    y: CY + 12,
    fill: "#1c1508",
    "font-family": "IBM Plex Mono, monospace",
    "font-size": 9,
    "text-anchor": "middle",
    opacity: 0.75,
  });
  coreSub.textContent = "AUTH · GYM-ORGS";
  core.appendChild(coreSub);

  document.getElementById("core-hit").addEventListener("click", () => selectFoundation());
  document.getElementById("core-hit").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectFoundation();
    }
  });

  for (const stint of ROADMAP.stints) {
    const r = RADII[stint.orbit];
    const n = stint.items.length;
    const startAngle = stint.orbit === 1 ? -20 : stint.orbit === 2 ? 10 : -5;
    const sweep = 300;
    stint.items.forEach((item, i) => {
      const angle = startAngle + (sweep / Math.max(n - 1, 1)) * i;
      const { x, y } = polar(angle, r);
      const g = svgEl("g", {
        class: "orbit-node",
        tabindex: "0",
        role: "button",
        "aria-label": `${item.num} ${item.title}`,
        "data-id": item.id,
        transform: `translate(${x} ${y})`,
      });

      const pulse = svgEl("g", { class: "node-pulse" });
      const own = item.ownership;
      const disk = svgEl("circle", {
        class: "node-disk",
        cx: 0,
        cy: 0,
        r: 11,
        fill: OWN_FILL[own],
        stroke: OWN_STROKE[own],
        "stroke-width": own === "client" ? 2 : 2.25,
        "stroke-dasharray": own === "client" ? "3 2" : "none",
      });
      pulse.appendChild(disk);

      const label = svgEl("text", {
        x: 0,
        y: 3.5,
        fill: own === "done" ? "#1c1508" : OWN_STROKE[own],
        "font-family": "IBM Plex Mono, monospace",
        "font-size": 8,
        "font-weight": 500,
        "text-anchor": "middle",
        "pointer-events": "none",
      });
      label.textContent = item.num;
      pulse.appendChild(label);
      g.appendChild(pulse);

      g.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem(item.id);
      });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectItem(item.id);
        }
      });

      nodes.appendChild(g);
    });
  }
}

function setDock({ kicker, title, body, meta, exit, ownership }) {
  const dock = document.getElementById("dock");
  dock.dataset.ownership = ownership || "gym";
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
}

function clearNodeSelection() {
  document.querySelectorAll(".orbit-node.is-selected").forEach((n) => n.classList.remove("is-selected"));
  document.querySelectorAll(".item-list li.is-active").forEach((n) => n.classList.remove("is-active"));
}

function selectFoundation() {
  clearNodeSelection();
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
  pauseOrbitBriefly();
}

function selectItem(id) {
  const entry = itemIndex.get(id);
  if (!entry) return;
  const { item, stint, kind } = entry;

  clearNodeSelection();
  document.querySelectorAll(`.orbit-node[data-id="${id}"]`).forEach((n) => n.classList.add("is-selected"));
  document.querySelectorAll(`.item-list li[data-id="${id}"]`).forEach((n) => n.classList.add("is-active"));

  const meta = {
    PRD: item.prd,
    Paths: item.paths,
    Ownership: ownershipLabel(item.ownership),
    Status: item.status === "done" ? "Shipped" : "Todo",
  };

  setDock({
    kicker: kind === "foundation" ? "Foundation" : `${stint.label} · ${stint.title}`,
    title: `${item.num}  ${item.title}`,
    body: item.body,
    meta,
    exit: kind === "stint" ? stint.exit : null,
    ownership: item.ownership,
  });

  pauseOrbitBriefly();
}

function ownershipLabel(o) {
  if (o === "gym") return "Gym-owned";
  if (o === "client") return "Client-owned";
  if (o === "platform") return "Platform";
  if (o === "done") return "Shipped";
  return o;
}

function ownershipClass(o) {
  return `own-${o === "done" ? "done" : o}`;
}

let pauseTimer = null;
function pauseOrbitBriefly() {
  const frame = document.getElementById("orbit-frame");
  frame.classList.add("is-paused");
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => frame.classList.remove("is-paused"), 4500);
}

function renderRunsheet() {
  const root = document.getElementById("runsheet-root");
  root.replaceChildren();

  // Foundation
  const fBlock = document.createElement("article");
  fBlock.className = "stint-block foundation-block";
  fBlock.innerHTML = `
    <div class="stint-head">
      <h3>Foundation</h3>
      <span class="stint-tag">Shipped</span>
    </div>
    <p class="stint-outcome">${escapeHtml(ROADMAP.foundation.body)}</p>
  `;
  const fList = document.createElement("ul");
  fList.className = "item-list";
  for (const item of ROADMAP.foundation.items) {
    fList.appendChild(runsheetItem(item, false));
  }
  fBlock.appendChild(fList);
  root.appendChild(fBlock);

  for (const stint of ROADMAP.stints) {
    const block = document.createElement("article");
    block.className = "stint-block";
    block.id = `stint-${stint.orbit}`;
    block.innerHTML = `
      <div class="stint-head">
        <h3>${escapeHtml(stint.label)} — ${escapeHtml(stint.title)}</h3>
        <span class="stint-tag">${escapeHtml(stint.tagline)}</span>
      </div>
      <p class="stint-outcome">${escapeHtml(stint.outcome)}</p>
    `;
    const list = document.createElement("ul");
    list.className = "item-list";
    for (const item of stint.items) {
      list.appendChild(runsheetItem(item, true));
    }
    block.appendChild(list);

    const exit = document.createElement("p");
    exit.className = "exit-banner";
    exit.textContent = `Exit: ${stint.exit}`;
    block.appendChild(exit);

    root.appendChild(block);
  }
}

function runsheetItem(item, clickable) {
  const li = document.createElement("li");
  li.dataset.id = item.id;
  li.innerHTML = `
    <span class="num">${escapeHtml(item.num)}</span>
    <span>
      <span class="title">${escapeHtml(item.title)}</span>
      <span class="paths">${escapeHtml(item.paths)}</span>
    </span>
    <span class="own ${ownershipClass(item.ownership)}">${escapeHtml(ownershipLabel(item.ownership))}</span>
  `;
  if (clickable) {
    li.addEventListener("click", () => {
      selectItem(item.id);
      document.getElementById("orbit").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  return li;
}

function renderDeferred() {
  const ul = document.getElementById("deferred-list");
  ul.replaceChildren();
  for (const d of ROADMAP.deferred) {
    const li = document.createElement("li");
    li.textContent = d;
    ul.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let orbitBooted = false;

export function bootOrbit() {
  if (orbitBooted) return;
  if (!document.getElementById("orbit-svg")) return;

  indexData();
  renderOrbit();
  renderRunsheet();
  renderDeferred();
  selectFoundation();

  const frame = document.getElementById("orbit-frame");
  frame.addEventListener("mouseenter", () => frame.classList.add("is-paused"));
  frame.addEventListener("mouseleave", () => frame.classList.remove("is-paused"));
  orbitBooted = true;
}

window.bootOrbit = bootOrbit;
