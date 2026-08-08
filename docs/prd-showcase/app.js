(() => {
  /* ── Product modules ─────────────────────────────────────────── */
  const modules = window.MODULES_DATA || [];

  const grid = document.getElementById("mod-grid");

  function openModuleDetail(m) {
    if (!m?.detail || typeof window.openReaderModal !== "function") return;
    window.openReaderModal({
      title: `${m.id}  ${m.name}`,
      kicker: "Module · how it works",
      showToc: true,
      sections: window.sectionsFromDetail(m.detail),
    });
  }

  function renderModules(filter = "all") {
    grid.innerHTML = "";
    modules.forEach((m) => {
      if (filter !== "all" && !m.filters.includes(filter)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mod";
      btn.dataset.id = m.id;
      const how = (m.howItWorks || [])
        .map((step) => `<li>${step}</li>`)
        .join("");
      btn.innerHTML = `
        <div class="mod-head">
          <div>
            <div class="mod-id">${m.id}</div>
            <div class="mod-name">${m.name}</div>
            <div class="mod-tags">
              ${m.tags.map((t) => `<span class="tag ${t}">${t}</span>`).join("")}
            </div>
          </div>
          <div class="chev" aria-hidden="true">+</div>
        </div>
        <div class="mod-body">
          ${m.summary ? `<p class="mod-summary">${m.summary}</p>` : ""}
          ${m.personas ? `<p class="mod-personas"><strong>Who:</strong> ${m.personas}</p>` : ""}
          ${how ? `<p class="mod-how-label">How it works</p><ol class="mod-how">${how}</ol>` : ""}
          <ul>
            ${m.items
              .map((item) => {
                if (typeof item === "string") return `<li>${item}</li>`;
                return `<li class="out">${item.text}</li>`;
              })
              .join("")}
          </ul>
          ${
            m.detail
              ? `<div class="mod-actions"><span class="cta cta-ghost mod-detail-btn" data-mod="${m.id}" role="button" tabindex="0">How it works — full detail</span></div>`
              : ""
          }
        </div>
      `;
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".mod-detail-btn")) {
          e.preventDefault();
          e.stopPropagation();
          openModuleDetail(m);
          return;
        }
        const wasOpen = btn.classList.contains("open");
        grid.querySelectorAll(".mod.open").forEach((el) => el.classList.remove("open"));
        if (!wasOpen) btn.classList.add("open");
      });
      grid.appendChild(btn);
    });
  }

  renderModules();

  document.querySelectorAll(".mod-toolbar .filter-btn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".mod-toolbar .filter-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      renderModules(b.dataset.filter);
    });
  });

  document.getElementById("open-full-prd")?.addEventListener("click", () => {
    const prd = window.PRD_READER;
    if (!prd || typeof window.openReaderModal !== "function") return;
    window.openReaderModal({
      title: prd.title,
      kicker: prd.kicker,
      showToc: true,
      sections: prd.sections,
    });
  });

  /* ── Roles & permissions ─────────────────────────────────────── */
  const ROLE_ORDER = ["CLIENT", "STAFF_UNASSIGNED", "TRAINER", "ADMIN"];
  const CHECK =
    '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.4 2.4 4.6-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
  const { roles, permissions, authzLayers, notes } = window.ROLES_DATA;
  let activeRole = "ALL";
  let rolesBooted = false;

  function countFor(code) {
    return permissions.filter((p) => p.roles.includes(code)).length;
  }

  function renderRoles() {
    const roleGrid = document.getElementById("role-grid");
    roleGrid.innerHTML = roles
      .map(
        (r) => `
      <button type="button" class="role-card${activeRole === r.code ? " is-active" : ""}" data-role="${r.code}" data-color="${r.color}" role="option" aria-selected="${activeRole === r.code}">
        <p class="code">${r.code}</p>
        <span class="lane-pill">${r.lane}</span>
        <h3>${r.name}</h3>
        <p class="count">${countFor(r.code)} permissions</p>
      </button>`
      )
      .join("");

    roleGrid.querySelectorAll(".role-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.role;
        activeRole = activeRole === code ? "ALL" : code;
        syncRoles();
      });
    });

    const detail = document.getElementById("role-detail");
    const selected = roles.find((r) => r.code === activeRole);
    detail.textContent = selected
      ? selected.blurb
      : "Showing the full matrix. Select a role to highlight its grants.";
  }

  function renderPermFilters() {
    const root = document.getElementById("matrix-filters");
    const items = [
      { code: "ALL", label: "All" },
      ...roles.map((r) => ({
        code: r.code,
        label: r.code === "STAFF_UNASSIGNED" ? "Unassigned" : r.name,
      })),
    ];
    root.innerHTML = items
      .map(
        (i) =>
          `<button type="button" class="perm-filter${activeRole === i.code ? " is-active" : ""}" data-role="${i.code}">${i.label}</button>`
      )
      .join("");

    root.querySelectorAll(".perm-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeRole = btn.dataset.role;
        syncRoles();
      });
    });
  }

  function renderPermMatrix() {
    const body = document.getElementById("matrix-body");
    const groups = [...new Set(permissions.map((p) => p.group))];
    let html = "";

    for (const group of groups) {
      html += `<tr class="group-row"><td colspan="5">${group}</td></tr>`;
      for (const perm of permissions.filter((p) => p.group === group)) {
        const holds = activeRole === "ALL" || perm.roles.includes(activeRole);
        const rowClass = activeRole === "ALL" ? "" : holds ? "is-highlight" : "is-dimmed";
        const cells = ROLE_ORDER.map((role) => {
          const on = perm.roles.includes(role);
          const focus = activeRole !== "ALL" && activeRole === role && on;
          return `<td class="${focus ? "is-focus" : ""}"><span class="cell ${on ? "on" : "off"}" title="${on ? "granted" : "not granted"}">${on ? CHECK : ""}</span></td>`;
        }).join("");
        html += `<tr class="${rowClass}">
          <td>
            <span class="perm-code">${perm.code}</span>
            <span class="perm-label">${perm.label}</span>
          </td>
          ${cells}
        </tr>`;
      }
    }

    body.innerHTML = html;
  }

  function renderAuthzStack() {
    document.getElementById("authz-stack").innerHTML = authzLayers
      .map(
        (layer, i) => `
      <li>
        <span class="n" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <h3>${layer.title}</h3>
          <p>${layer.body}</p>
        </div>
      </li>`
      )
      .join("");
  }

  function renderNotes() {
    document.getElementById("notes-list").innerHTML = notes.map((n) => `<li>${n}</li>`).join("");
  }

  function syncRoles() {
    renderRoles();
    renderPermFilters();
    renderPermMatrix();
  }

  function bootRoles() {
    if (rolesBooted) {
      syncRoles();
      return;
    }
    syncRoles();
    renderAuthzStack();
    renderNotes();
    rolesBooted = true;
  }

  /* ── Tabs ────────────────────────────────────────────────────── */
  const viewPrd = document.getElementById("view-prd");
  const viewRoles = document.getElementById("view-roles");
  const viewOrbit = document.getElementById("view-orbit");
  const navPrd = document.getElementById("nav-links-prd");
  const navRoles = document.getElementById("nav-links-roles");
  const navOrbit = document.getElementById("nav-links-orbit");
  const tabBtns = [...document.querySelectorAll(".site-tab")];
  const views = { prd: viewPrd, roles: viewRoles, orbit: viewOrbit };
  const navs = { prd: navPrd, roles: navRoles, orbit: navOrbit };
  const titles = {
    prd: "Gym SaaS — Product Blueprint",
    roles: "Gym SaaS — Roles & Permissions",
    orbit: "Gym SaaS — Capability Orbit",
  };

  function setTab(tab, { pushHash = true } = {}) {
    if (!views[tab]) tab = "prd";

    tabBtns.forEach((btn) => {
      const on = btn.dataset.tab === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });

    for (const [key, el] of Object.entries(views)) {
      const on = key === tab;
      el.classList.toggle("is-active", on);
      el.hidden = !on;
    }

    for (const [key, el] of Object.entries(navs)) {
      const on = key === tab;
      el.hidden = !on;
      el.classList.toggle("is-hidden", !on);
    }

    document.title = titles[tab] ?? titles.prd;

    if (tab === "roles") bootRoles();
    if (tab === "orbit") {
      if (typeof window.bootOrbit === "function") window.bootOrbit();
      else {
        // orbit-app.js is a deferred module — retry briefly
        let n = 0;
        const t = setInterval(() => {
          n += 1;
          if (typeof window.bootOrbit === "function") {
            window.bootOrbit();
            clearInterval(t);
          } else if (n > 40) clearInterval(t);
        }, 50);
      }
    }

    if (pushHash) {
      const sectionHashes =
        /^(positioning|surfaces|modules|matrix|stack|out|lanes|roles-pick|perm-matrix|authz|roles-notes|roles-top|orbit|orbit-top|runsheet|deferred)$/;
      const next = `#${tab}`;
      if (location.hash !== next && !sectionHashes.test(location.hash.slice(1))) {
        history.replaceState(null, "", next);
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setTab(btn.dataset.tab);
      history.replaceState(null, "", `#${btn.dataset.tab}`);
    });
  });

  document.querySelectorAll("[data-goto-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-goto-tab");
      setTab(tab);
      history.replaceState(null, "", `#${tab}`);
    });
  });

  document.querySelectorAll('[data-tab-home="prd"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      if (viewPrd.hidden) {
        e.preventDefault();
        setTab("prd");
        history.replaceState(null, "", "#prd");
      }
    });
  });

  function tabFromHash() {
    const h = location.hash.slice(1);
    if (
      h === "roles" ||
      ["lanes", "roles-pick", "perm-matrix", "authz", "roles-notes", "roles-top"].includes(h)
    ) {
      return "roles";
    }
    if (
      h === "orbit" ||
      ["orbit-top", "runsheet", "deferred"].includes(h) ||
      h === "orbit" /* keep */
    ) {
      // #orbit is both tab id and section — treat as orbit tab
      if (h === "orbit" || ["orbit-top", "runsheet", "deferred"].includes(h)) return "orbit";
    }
    if (h === "prd" || h === "top" || h === "") return "prd";
    // Product section anchors
    if (["positioning", "surfaces", "modules", "matrix", "stack", "out"].includes(h)) return "prd";
    return "prd";
  }

  setTab(tabFromHash(), { pushHash: false });

  window.addEventListener("hashchange", () => {
    const tab = tabFromHash();
    const current = Object.entries(views).find(([, el]) => !el.hidden)?.[0];
    if (tab !== current) setTab(tab, { pushHash: false });
  });

  /* Active section nav on scroll (visible tab only) */
  function activeLinks() {
    return [...document.querySelectorAll(".nav-links:not([hidden]) a")].filter(
      (a) => a.getAttribute("href")?.startsWith("#")
    );
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = "#" + e.target.id;
        activeLinks().forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
  );

  [
    "positioning",
    "surfaces",
    "modules",
    "matrix",
    "stack",
    "out",
    "lanes",
    "roles-pick",
    "perm-matrix",
    "authz",
    "roles-notes",
    "orbit",
    "runsheet",
    "deferred",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();
