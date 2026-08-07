(() => {
  /* ── Product modules ─────────────────────────────────────────── */
  const modules = [
    {
      id: "M1",
      name: "Identity & Access",
      filters: ["client", "trainer", "admin", "platform"],
      tags: ["client", "trainer", "admin"],
      items: [
        "Email OTP auth (canonical, free transactional email)",
        "Google OAuth + email link",
        "Frozen roles + permissions; CLIENT | STAFF lanes",
        "Admin-as-Trainer capability",
      ],
    },
    {
      id: "M2",
      name: "Gym Organization",
      filters: ["admin", "trainer", "client"],
      tags: ["admin"],
      items: [
        "GymOrg create / profile / branding / timezone",
        "Client membership invites (in-app list)",
        "Staff invites via staff_code / QR",
        "Ownership: multi-org in DB, single-gym UI",
        { text: "Open gym join codes", out: true },
      ],
    },
    {
      id: "M3",
      name: "Members & Memberships",
      filters: ["admin", "client", "trainer"],
      tags: ["admin", "client"],
      items: [
        "Invite accept → ACTIVE membership + base sub",
        "Roster: ACTIVE / INACTIVE",
        "DataGrants: profile attributes + class grants (no copy)",
        "Trainer assignment (requires active Trainer addon)",
        "Offboard clears grants; attendance retained",
        "Block check-in (Admin safety valve)",
      ],
    },
    {
      id: "M4",
      name: "Plans & Billing Status",
      filters: ["admin", "client"],
      tags: ["admin", "client"],
      items: [
        "Admin-named catalog: kind BASE | ADDON + capability",
        "Base subscription required; Trainer addon optional",
        "Price/duration snapshot on each subscription line",
        "Payment status per line: paid / unpaid / partial",
        "Base start: first attendance | override; addon: attach day",
        "Renewals: new row per period; T-2 for base + addon",
        "Daily Admin nudge for unpaid / partial lines",
      ],
    },
    {
      id: "M5",
      name: "Attendance",
      filters: ["client", "admin", "trainer"],
      tags: ["client", "admin"],
      items: [
        "Client self check-in",
        "Admin desk mark",
        "Per-client / per-day / gym-wide logs",
        { text: "Trainer log, QR, geofence", out: true },
      ],
    },
    {
      id: "M6",
      name: "Coaching — Diet",
      filters: ["trainer", "client", "admin"],
      tags: ["trainer", "client"],
      items: [
        "Structured meals / slots / targets",
        "Free-text notes",
        "Assign only with active Trainer addon",
        "Per-day PlanCompletion; staff adherence needs DIET_PLANS grant",
        "Clone / template (P1 UI)",
      ],
    },
    {
      id: "M7",
      name: "Coaching — Workout",
      filters: ["trainer", "client", "admin"],
      tags: ["trainer", "client"],
      items: [
        "Days → exercises → sets/reps",
        "Free-text notes",
        "Assign only with active Trainer addon",
        "Per-day PlanCompletion; staff adherence needs WORKOUT_PLANS grant",
        "Clone / template (P1 UI)",
      ],
    },
    {
      id: "M8",
      name: "Progress & Body Metrics",
      filters: ["client", "trainer", "admin"],
      tags: ["client", "trainer"],
      items: [
        "Client-owned ProgressLog (canonical weight)",
        "BMI from profile height + current weight",
        "Attendance history (gym-owned)",
        "Plan adherence % (staff needs class grant)",
        "Profile: height, DOB, gender, medical notes",
      ],
    },
    {
      id: "M9",
      name: "Nutrition",
      filters: ["client", "trainer", "admin"],
      tags: ["client"],
      items: [
        "Client-owned calorie diary",
        "Owned Indian FoodItem catalog",
        "NL / qty parser (“2 idlis, 1 omelette”)",
        "Daily calorie / macro log vs target",
        "Manual entry fallback",
        "Staff read only with CALORIES grant",
      ],
    },
    {
      id: "M10",
      name: "Health Sync",
      filters: ["client", "trainer", "admin"],
      tags: ["client"],
      items: [
        "Client-owned wearable connection + daily metrics",
        "Apple Health (HealthKit)",
        "Google Health Connect",
        "Samsung Health",
        "Sync: steps, workouts, active calories, weight",
        "Staff read only with WEARABLES grant",
      ],
    },
    {
      id: "M11",
      name: "Mini-CRM",
      filters: ["admin"],
      tags: ["admin"],
      items: [
        "Lead capture (soft duplicate phone warn)",
        "Pipeline: New → Contacted → Trial → Converted → Lost",
        "Follow-up reminders",
        "Convert → membership invite (P1)",
      ],
    },
    {
      id: "M12",
      name: "Notifications & Inbox",
      filters: ["client", "trainer", "admin", "platform"],
      tags: ["admin", "client"],
      items: [
        "Push (FCM / APNs)",
        "In-app notifications",
        "Admin web inbox (renewals, unpaid nudge, lead follow-ups)",
        { text: "WhatsApp / reminder SMS", out: true },
      ],
    },
    {
      id: "M13",
      name: "Platform / Shared",
      filters: ["platform", "admin"],
      tags: ["admin"],
      items: [
        "Tenancy (gym_org_id for GymOwned)",
        "DataGrants for ClientOwned reads",
        "Soft delete via deleted_at; DPDP erasure path",
        "Audit trail",
        "Scheduled jobs (T-2 renewals, unpaid digest, follow-ups)",
        "File / branding storage",
      ],
    },
  ];

  const grid = document.getElementById("mod-grid");

  function renderModules(filter = "all") {
    grid.innerHTML = "";
    modules.forEach((m) => {
      if (filter !== "all" && !m.filters.includes(filter)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mod";
      btn.dataset.id = m.id;
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
          <ul>
            ${m.items
              .map((item) => {
                if (typeof item === "string") return `<li>${item}</li>`;
                return `<li class="out">${item.text}</li>`;
              })
              .join("")}
          </ul>
        </div>
      `;
      btn.addEventListener("click", () => {
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
