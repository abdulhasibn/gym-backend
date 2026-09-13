/**
 * Shared large reading modal for Product + Orbit.
 * API: openReaderModal({ title, kicker?, sections?, html?, showToc? })
 *      closeReaderModal()
 *      sectionsFromDetail(detail, extras?)
 */
(() => {
  let lastFocus = null;
  let onKeyDown = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getEls() {
    const root = document.getElementById("reader-modal");
    if (!root) return null;
    return {
      root,
      title: document.getElementById("reader-modal-title"),
      kicker: document.getElementById("reader-modal-kicker"),
      toc: document.getElementById("reader-modal-toc"),
      tocList: document.getElementById("reader-modal-toc-list"),
      layout: document.getElementById("reader-modal-layout"),
      body: document.getElementById("reader-modal-body"),
      closeBtn: document.getElementById("reader-modal-close"),
    };
  }

  function renderSections(sections) {
    return (sections || [])
      .map((sec) => {
        const id = sec.id ? ` id="${escapeHtml(sec.id)}"` : "";
        const title = sec.title ? `<h3${id}>${escapeHtml(sec.title)}</h3>` : "";
        const paras = (sec.paragraphs || [])
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("");
        let list = "";
        if (sec.bullets?.length) {
          list = `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
        } else if (sec.steps?.length) {
          list = `<ol>${sec.steps.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ol>`;
        }
        const table = sec.tableHtml || "";
        const html = sec.html || "";
        return `${title}${paras}${list}${table}${html}`;
      })
      .join("");
  }

  function focusable(root) {
    return [
      ...root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function closeReaderModal() {
    const els = getEls();
    if (!els || els.root.hidden) return;
    els.root.hidden = true;
    document.body.classList.remove("reader-modal-open");
    if (onKeyDown) {
      document.removeEventListener("keydown", onKeyDown);
      onKeyDown = null;
    }
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
    lastFocus = null;
  }

  /**
   * @param {{ title: string, kicker?: string, sections?: Array, html?: string, showToc?: boolean }} opts
   */
  function openReaderModal(opts) {
    const els = getEls();
    if (!els) return;

    lastFocus = document.activeElement;
    const title = opts.title || "Details";
    const kicker = opts.kicker || "Reading view";
    const sections = opts.sections || [];
    const showToc = Boolean(opts.showToc && sections.length);

    els.title.textContent = title;
    els.kicker.textContent = kicker;
    els.layout.classList.toggle("has-toc", showToc);
    els.toc.hidden = !showToc;

    if (showToc) {
      els.tocList.innerHTML = sections
        .filter((s) => s.id && s.title)
        .map(
          (s) =>
            `<a href="#${escapeHtml(s.id)}">${escapeHtml(s.title)}</a>`,
        )
        .join("");
      els.tocList.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const id = a.getAttribute("href")?.slice(1);
          const target = id ? els.body.querySelector(`#${CSS.escape(id)}`) : null;
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    } else {
      els.tocList.innerHTML = "";
    }

    els.body.innerHTML = opts.html || renderSections(sections);
    els.body.scrollTop = 0;

    els.root.hidden = false;
    document.body.classList.add("reader-modal-open");
    els.closeBtn.focus();

    onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeReaderModal();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusable(els.root);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
  }

  /** Build modal sections from an orbit/module detail object. */
  function sectionsFromDetail(detail, extras = {}) {
    const sections = [];
    if (detail?.purpose) {
      sections.push({
        id: "purpose",
        title: "Purpose",
        paragraphs: [detail.purpose],
      });
    }
    if (detail?.howItWorks?.length) {
      sections.push({
        id: "how",
        title: "How it works",
        steps: detail.howItWorks,
      });
    }
    if (detail?.acceptance?.length) {
      sections.push({
        id: "acceptance",
        title: "Acceptance / exit signals",
        bullets: detail.acceptance,
      });
    }
    if (detail?.notes?.length) {
      sections.push({
        id: "notes",
        title: "Notes",
        bullets: detail.notes,
      });
    }
    if (detail?.prdRefs || extras.prdRefs) {
      sections.push({
        id: "prd",
        title: "PRD anchors",
        paragraphs: [detail?.prdRefs || extras.prdRefs],
      });
    }
    if (extras.exit) {
      sections.push({
        id: "exit",
        title: "Stint exit criteria",
        paragraphs: [extras.exit],
      });
    }
    return sections;
  }

  function wireModal() {
    const els = getEls();
    if (!els) return;
    els.closeBtn.addEventListener("click", closeReaderModal);
    els.root.addEventListener("click", (e) => {
      if (e.target === els.root) closeReaderModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireModal);
  } else {
    wireModal();
  }

  window.openReaderModal = openReaderModal;
  window.closeReaderModal = closeReaderModal;
  window.sectionsFromDetail = sectionsFromDetail;
  window.escapeReaderHtml = escapeHtml;
})();
