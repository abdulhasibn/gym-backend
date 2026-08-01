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

    function render(filter = "all") {
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

    render();

    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        render(b.dataset.filter);
      });
    });

    /* Active nav on scroll */
    const links = [...document.querySelectorAll(".nav-links a")];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = "#" + e.target.id;
          links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
