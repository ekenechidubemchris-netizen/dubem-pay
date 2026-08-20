/* =================================================================
   DUBEMPAY — features.js
   =================================================================
   Loaded third. The bigger, more self-contained dashboard features:
   subscriptions (link/pause/unlink), recent activity + the full
   transactions table (including search filtering), the Tier 1/2/3
   verification flow, and Rewards + Savings & Wealth. Depends on
   helpers/appState from core.js.
   ================================================================= */


/* -----------------------------------------------------------------
   7. SUBSCRIPTIONS: link new / pause / unlink / monthly total
----------------------------------------------------------------- */

// 🔧 EDIT HERE: starter subscriptions shown on first load. Add/remove objects freely —
// each one just needs { name, category, price, renewDate }.
const STARTER_SUBSCRIPTIONS = [
  { name: "Netflix", category: "Video Streaming & TV", price: 15.49, renewDate: "2026-08-14" },
  { name: "Spotify Premium", category: "Music & Audio", price: 11.99, renewDate: "2026-08-09" },
  { name: "Claude Pro (Anthropic)", category: "AI & Smart Tools", price: 20.0, renewDate: "2026-08-20" },
];

// Maps each subscription category to a Bootstrap Icons class. We use category
// icons rather than official brand logos on purpose — reproducing real
// trademarked logo artwork isn't something we can safely bundle into a
// student project, but a category icon still tells you what kind of
// service you're looking at at a glance.
const CATEGORY_ICONS = {
  "Video Streaming & TV": "bi-play-circle-fill",
  "Music & Audio": "bi-music-note-beamed",
  "Software & Productivity": "bi-cloud-fill",
  "AI & Smart Tools": "bi-cpu-fill",
  "Privacy & Security": "bi-shield-lock-fill",
  "Education & Self-Improvement": "bi-mortarboard-fill",
  "News & Journalism": "bi-newspaper",
  "Lifestyle & Fitness": "bi-heart-pulse-fill",
};
// Fallback icon for any category not listed above (keeps the app from breaking
// if you add a new optgroup later and forget to add its icon here).
const DEFAULT_CATEGORY_ICON = "bi-app-indicator";

// Set inside initSubscriptions() so filterSubscriptionCards() (called from
// the topbar search in ui.js) can reach the grid without needing its own
// getElementById call every keystroke.
let subsGridEl = null;

/**
 * filterSubscriptionCards
 * DOM-based filter (not a re-render like transactions) since subscription
 * cards are actual persistent elements with their own event listeners —
 * we just show/hide them rather than rebuilding from appState each time.
 */
function filterSubscriptionCards(query) {
  if (!subsGridEl) return;
  const cols = subsGridEl.querySelectorAll(".dp-sub-col");
  let visibleCount = 0;

  cols.forEach((col) => {
    const name = col.querySelector(".dp-sub-name")?.textContent.toLowerCase() || "";
    const category = col.querySelector(".dp-sub-cat")?.textContent.toLowerCase() || "";
    const matches = !query || name.includes(query) || category.includes(query);
    col.classList.toggle("d-none", !matches);
    if (matches) visibleCount += 1;
  });

  let emptyMsg = document.getElementById("subsSearchEmpty");
  if (visibleCount === 0 && query) {
    if (!emptyMsg) {
      emptyMsg = document.createElement("div");
      emptyMsg.id = "subsSearchEmpty";
      emptyMsg.className = "col-12 text-center dp-mini-copy py-3";
      subsGridEl.appendChild(emptyMsg);
    }
    emptyMsg.textContent = `No subscriptions match "${query}".`;
    emptyMsg.classList.remove("d-none");
  } else if (emptyMsg) {
    emptyMsg.classList.add("d-none");
  }
}

function initSubscriptions() {
  const grid = document.getElementById("subsGrid");
  subsGridEl = grid; // exposes the grid to filterSubscriptionCards() above
  const template = document.getElementById("subCardTemplate");
  const form = document.getElementById("subForm");
  const select = document.getElementById("subSelect");
  const renewInput = document.getElementById("subRenewDate");
  const monthlyTotalEl = document.getElementById("subsMonthlyTotal");

  /**
   * recalcMonthlyTotal
   * Adds up the price of every subscription card currently in the grid
   * that ISN'T paused, and updates the sidebar summary figure.
   */
  function recalcMonthlyTotal() {
    let total = 0;
    grid.querySelectorAll(".dp-sub-card").forEach((card) => {
      if (card.classList.contains("is-paused")) return; // paused = not billed, skip it
      const priceText = card.querySelector(".dp-sub-price").textContent.replace("$", "");
      total += parseFloat(priceText) || 0;
    });
    monthlyTotalEl.textContent = formatMoney(total);
  }

  /**
   * updateEmptyState
   * Shows/hides a real "no subscriptions yet" message when the grid has
   * zero cards left — distinct from the search "no results" message
   * (filterSubscriptionCards handles that one), since this covers the
   * case where every subscription has actually been unlinked.
   */
  function updateEmptyState() {
    let emptyState = document.getElementById("subsEmptyState");
    const hasCards = grid.querySelectorAll(".dp-sub-card").length > 0;

    if (!hasCards) {
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.id = "subsEmptyState";
        emptyState.className = "col-12 dp-subs-empty";
        emptyState.innerHTML = `
          <i class="bi bi-inboxes"></i>
          <p class="mb-1">No subscriptions linked yet.</p>
          <p class="dp-mini-copy mb-0">Use "Link New Subscription" above to add your first one.</p>
        `;
        grid.appendChild(emptyState);
      }
      emptyState.classList.remove("d-none");
    } else if (emptyState) {
      emptyState.classList.add("d-none");
    }
  }

  /**
   * addSubscriptionCard
   * Clones the hidden <template id="subCardTemplate"> from index.html,
   * fills in the given data, wires up its Pause/Unlink controls, and
   * appends it to the grid. Every subscription now carries a unique
   * `id` so pause/unlink can find and update the right entry in
   * appState.subscriptions — matching by name alone would break if
   * someone linked the same service twice.
   */
  function addSubscriptionCard(sub) {
    const clone = template.content.cloneNode(true);

    const badge = clone.querySelector(".dp-sub-badge i");
    badge.className = `bi ${CATEGORY_ICONS[sub.category] || DEFAULT_CATEGORY_ICON}`;

    // SECURITY: name/category ultimately come from our own <option> data
    // attributes (not free-typed user text), but we still use textContent
    // here rather than innerHTML — textContent can never be interpreted as
    // HTML/script, so it's the safe default any time we're just displaying text.
    clone.querySelector(".dp-sub-name").textContent = sub.name;
    clone.querySelector(".dp-sub-cat").textContent = sub.category;
    clone.querySelector(".dp-sub-price").textContent = formatMoney(sub.price) + "/mo";

    const renewLabel = new Date(sub.renewDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    clone.querySelector(".dp-sub-renew").textContent = `Renews ${renewLabel}`;

    const card = clone.querySelector(".dp-sub-card");
    const toggle = clone.querySelector(".dp-sub-toggle");
    const unlinkBtn = clone.querySelector(".dp-sub-unlink");

    card.dataset.subId = sub.id;
    toggle.checked = !sub.paused;
    card.classList.toggle("is-paused", !!sub.paused);

    // Pause / resume auto-pay — persisted so it's still paused next time you log in
    toggle.addEventListener("change", () => {
      card.classList.toggle("is-paused", !toggle.checked);
      const entry = appState.subscriptions.find((s) => s.id === sub.id);
      if (entry) entry.paused = !toggle.checked;
      persistState();
      recalcMonthlyTotal();
    });

    // Unlink completely removes the card from the grid AND from saved state
    unlinkBtn.addEventListener("click", () => {
      card.closest(".dp-sub-col").remove();
      appState.subscriptions = appState.subscriptions.filter((s) => s.id !== sub.id);
      persistState();
      recalcMonthlyTotal();
      updateEmptyState();
    });

    grid.appendChild(clone);
    updateEmptyState();
  }

  // First-ever login for this account: seed appState with the starter demo
  // subscriptions (each given a real id) and save it. Every login after
  // that reuses whatever's already saved — including pauses/unlinks/additions.
  if (!appState.subscriptions) {
    appState.subscriptions = STARTER_SUBSCRIPTIONS.map((sub) => ({
      ...sub,
      id: crypto.randomUUID(),
      paused: false,
    }));
    persistState();
  }
  appState.subscriptions.forEach(addSubscriptionCard);
  recalcMonthlyTotal();

  // SECURITY / UX: don't let anyone pick a renewal date in the past —
  // set the date input's minimum to today the moment the page loads.
  const todayISO = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  renewInput.setAttribute("min", todayISO);

  // --- Live icon preview: updates the moment a service is picked ---
  const previewBox = document.getElementById("subPreview");
  const previewIcon = document.getElementById("subPreviewIcon").querySelector("i");
  const previewName = document.getElementById("subPreviewName");
  const previewCat = document.getElementById("subPreviewCat");

  select.addEventListener("change", () => {
    const chosen = select.options[select.selectedIndex];
    if (!chosen || !chosen.value) {
      previewBox.classList.add("d-none");
      return;
    }
    const category = chosen.dataset.cat;
    previewIcon.className = `bi ${CATEGORY_ICONS[category] || DEFAULT_CATEGORY_ICON}`;
    previewName.textContent = chosen.value;   // textContent — safe even though this is <option> data
    previewCat.textContent = category;
    previewBox.classList.remove("d-none");
  });

  /**
   * validateSubForm
   * Confirms a real service was picked and the renewal date isn't in the past
   * (belt-and-suspenders alongside the "min" attribute we set above, since a
   * user could still type a manually-entered older date in some browsers).
   */
  function validateSubForm() {
    let isValid = true;

    if (!select.value) {
      showFieldError(select);
      isValid = false;
    } else {
      clearFieldError(select);
    }

    if (!renewInput.value || renewInput.value < todayISO) {
      showFieldError(renewInput);
      isValid = false;
    } else {
      clearFieldError(renewInput);
    }

    return isValid;
  }

  // Handle the "Link New Subscription" modal form
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateSubForm()) {
      return; // errors are already visible on the fields
    }

    const submitBtn = document.getElementById("subSubmitBtn");

    // Linking a subscription would normally mean calling out to the
    // provider (Netflix, Spotify, etc.) to set up billing — that's exactly
    // the kind of external call that can time out or get declined, so it
    // gets a real (if simulated) chance of failure here.
    const success = await withButtonLoading(submitBtn, {
      loadingText: "Linking…",
      successRate: 0.9,
    });

    if (!success) {
      showToast("❌ Couldn't link that subscription — please try again.", "error");
      playChime(500);
      return;
    }

    const chosenOption = select.options[select.selectedIndex];
    const newSub = {
      id: crypto.randomUUID(),
      name: chosenOption.value,
      category: chosenOption.dataset.cat,
      price: parseFloat(chosenOption.dataset.price),
      renewDate: renewInput.value,
      paused: false,
    };

    appState.subscriptions.push(newSub);
    persistState();
    addSubscriptionCard(newSub);
    recalcMonthlyTotal();

    playChime(920);
    fireCta(submitBtn);
    showToast(`✅ ${newSub.name} linked successfully.`);

    // Reset the form and close the modal so it's ready for next time
    form.reset();
    previewBox.classList.add("d-none");
    select.classList.remove("is-valid", "is-invalid");
    renewInput.classList.remove("is-valid", "is-invalid");
    const modalEl = document.getElementById("subModal");
    bootstrap.Modal.getInstance(modalEl)?.hide();
  });
}


/* -----------------------------------------------------------------
   8a. RECENT ACTIVITY — the small "newest first" snippet under the
       balance card. Separate from the full TRANSACTIONS table below
       on purpose: this is just a glance-and-go preview.
----------------------------------------------------------------- */

// 🔧 EDIT HERE: swap for your real most-recent activity. Icon options
// wired up in styles.css: "interest" (purple), "incoming" (green),
// "outgoing" (grey).
const RECENT_ACTIVITY = [
  {
    icon: "bi-percent",
    type: "interest",
    desc: "DubemWealth Interest Earned",
    time: "Aug 4, 3:04 AM",
    amount: 114.31,
    status: "Successful",
  },
  {
    icon: "bi-arrow-up",
    type: "outgoing",
    desc: "Transfer to Chidubem C.",
    time: "Aug 4, 12:04 AM",
    amount: -2000.0,
    status: "Successful",
  },
  {
    icon: "bi-arrow-down",
    type: "incoming",
    desc: "Received from Zenith Studio",
    time: "Aug 3, 6:47 PM",
    amount: 1200.0,
    status: "Successful",
  },
];

function initRecentActivity() {
  const list = document.getElementById("recentActivityList");
  const items = appState.recentActivity || [];

  if (!items.length) {
    list.innerHTML = `
      <p class="dp-mini-copy text-center py-3 mb-0">
        No activity yet — once you send, receive, or earn interest, it'll show up here.
      </p>
    `;
    return;
  }

  list.innerHTML = items.map((item) => {
    const isPositive = item.amount > 0;
    const amountText = (isPositive ? "+" : "-") + formatMoney(Math.abs(item.amount));
    const amountColor = isPositive ? "var(--dp-success)" : "var(--dp-text-primary)";

    return `
      <div class="dp-activity-row">
        <span class="dp-activity-icon dp-activity-icon-${item.type}"><i class="bi ${item.icon}"></i></span>
        <div class="dp-activity-info">
          <p class="dp-activity-desc mb-0">${escapeHTML(item.desc)}</p>
          <p class="dp-activity-time mb-0">${escapeHTML(item.time)}</p>
        </div>
        <div class="dp-activity-amt-wrap">
          <p class="dp-activity-amt mb-0" style="color:${amountColor};">${amountText}</p>
          <p class="dp-activity-status mb-0">${escapeHTML(item.status)}</p>
        </div>
      </div>
    `;
  }).join("");
}


/* -----------------------------------------------------------------
   8b. RECENT TRANSACTIONS — data + render + status filter
----------------------------------------------------------------- */

// Search + status filter state, read/written by both initTransactions()
// and applySearchQuery() (defined in ui.js) — see initTransactions below
// for how renderTransactionsFromState gets assigned.
let txActiveStatusFilter = "all";
let txSearchQuery = "";
let renderTransactionsFromState = null;

// 🔧 EDIT HERE: this is fake demo data. Replace with real transaction
// records (or fetch() them from an API) once DubemPay has a backend.
// `date` groups rows into "Aug 2026"-style month headers; `time` is
// the fuller display timestamp on each row.
const TRANSACTIONS = [
  { desc: "Transfer to Amaka O.", category: "Transfers", date: "Aug 2, 2026", time: "Aug 2, 4:12 PM", amount: -250.0, status: "Completed", type: "outgoing", icon: "bi-arrow-up" },
  { desc: "Netflix subscription", category: "Subscriptions", date: "Aug 1, 2026", time: "Aug 1, 9:00 AM", amount: -15.49, status: "Completed", type: "outgoing", icon: "bi-arrow-up" },
  { desc: "Received from Zenith Studio", category: "Income", date: "Jul 30, 2026", time: "Jul 30, 11:47 AM", amount: 1200.0, status: "Completed", type: "incoming", icon: "bi-arrow-down" },
  { desc: "OWealth Interest Earned", category: "Savings", date: "Jul 30, 2026", time: "Jul 30, 2:57 AM", amount: 1.94, status: "Completed", type: "interest", icon: "bi-percent" },
  { desc: "International wire — Lagos", category: "Transfers", date: "Jul 29, 2026", time: "Jul 29, 6:03 PM", amount: -430.0, status: "Pending", type: "outgoing", icon: "bi-arrow-up" },
  { desc: "Adobe Creative Cloud", category: "Subscriptions", date: "Jul 28, 2026", time: "Jul 28, 8:15 AM", amount: -20.99, status: "Completed", type: "outgoing", icon: "bi-arrow-up" },
  { desc: "Card top-up", category: "Card", date: "Jul 26, 2026", time: "Jul 26, 3:41 PM", amount: 500.0, status: "Failed", type: "incoming", icon: "bi-arrow-down" },
  { desc: "Spotify Premium", category: "Subscriptions", date: "Jul 24, 2026", time: "Jul 24, 7:30 AM", amount: -11.99, status: "Completed", type: "outgoing", icon: "bi-arrow-up" },
];

// Screenshot-matching display label for a status value — kept separate
// from the underlying `status` string so the status-filter dropdown
// (and dp-status-Completed CSS keying) don't have to change.
const TX_STATUS_LABELS = { Completed: "Successful", Pending: "Pending", Failed: "Failed" };

function initTransactions() {
  const container = document.getElementById("txTableBody");
  const categoryFilter = document.getElementById("txCategoryFilter");
  const statusFilter = document.getElementById("txStatusFilter");

  // Tracked outside renderTransactions so the topbar search (wired up in
  // ui.js, via the global applySearchQuery below) can trigger a re-render
  // without needing to know about the category/status filters at all.
  txActiveStatusFilter = "all";
  let txActiveCategoryFilter = "all";

  /**
   * renderTransactions
   * Rebuilds the page for the current category filter, status filter,
   * AND search query together — all three must pass for a row to show.
   * Matching rows are grouped by month (most recent first), each group
   * getting its own "Aug 2026" header, an In/Out total (Completed rows
   * only — Pending/Failed rows didn't actually move money), and an
   * "Analysis" stub button, mirroring the reference screenshot.
   */
  function renderTransactions() {
    const query = txSearchQuery;
    const all = appState.transactions || [];
    const rows = all.filter((tx) => {
      const matchesCategory = txActiveCategoryFilter === "all" || tx.category === txActiveCategoryFilter;
      const matchesStatus = txActiveStatusFilter === "all" || tx.status === txActiveStatusFilter;
      const matchesSearch =
        !query ||
        tx.desc.toLowerCase().includes(query) ||
        tx.status.toLowerCase().includes(query) ||
        (tx.category || "").toLowerCase().includes(query) ||
        tx.date.toLowerCase().includes(query);
      return matchesCategory && matchesStatus && matchesSearch;
    });

    if (rows.length === 0) {
      const message = !all.length
        ? "No transactions yet — they'll show up here once you start using your account."
        : query
        ? `No transactions match "${escapeHTML(txSearchQuery)}".`
        : "No transactions match this filter.";
      container.innerHTML = `<p class="dp-mini-copy text-center py-4 mb-0">${message}</p>`;
      return;
    }

    // Group by month, preserving the array's existing most-recent-first order.
    const groups = [];
    rows.forEach((tx) => {
      const label = new Date(tx.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, rows: [] };
        groups.push(group);
      }
      group.rows.push(tx);
    });

    container.innerHTML = groups
      .map((group) => {
        const totalIn = group.rows
          .filter((tx) => tx.amount > 0 && tx.status === "Completed")
          .reduce((sum, tx) => sum + tx.amount, 0);
        const totalOut = group.rows
          .filter((tx) => tx.amount < 0 && tx.status === "Completed")
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const rowsHtml = group.rows
          .map((tx) => {
            const isPositive = tx.amount > 0;
            const amountText = (isPositive ? "+" : "-") + formatMoney(Math.abs(tx.amount));
            // Only color an amount "success green" when it's BOTH positive AND actually completed —
            // a positive amount on a Failed/Pending row shouldn't look like money you already received.
            const amountColor =
              isPositive && tx.status === "Completed" ? "var(--dp-success)" : "var(--dp-text-primary)";
            return `
              <div class="dp-tx-row">
                <span class="dp-tx-icon dp-tx-icon-${tx.type}"><i class="bi ${tx.icon}"></i></span>
                <span class="dp-tx-info">
                  <span class="dp-tx-desc">${escapeHTML(tx.desc)}</span>
                  <span class="dp-tx-time">${escapeHTML(tx.time)}</span>
                </span>
                <span class="dp-tx-amount-wrap">
                  <span class="dp-tx-amount" style="color:${amountColor};">${amountText}</span>
                  <span class="dp-status-badge dp-status-${tx.status}">${TX_STATUS_LABELS[tx.status] || tx.status}</span>
                </span>
              </div>
            `;
          })
          .join("");

        return `
          <div class="dp-tx-month-group">
            <div class="dp-tx-month-header">
              <span class="dp-tx-month-title">${group.label} <i class="bi bi-chevron-down"></i></span>
              <button type="button" class="dp-tx-analysis-btn" data-label="Spending Analysis">Analysis</button>
            </div>
            <p class="dp-tx-month-summary">
              In: <strong>${formatMoney(totalIn)}</strong> &nbsp; Out: <strong>${formatMoney(totalOut)}</strong>
            </p>
            ${rowsHtml}
          </div>
        `;
      })
      .join("");
  }
  // Exposed at module scope (see the `let` declaration near the top of this
  // file) so applySearchQuery() in ui.js can trigger a re-render on typing.
  renderTransactionsFromState = renderTransactions;

  categoryFilter?.addEventListener("change", () => {
    txActiveCategoryFilter = categoryFilter.value;
    renderTransactions();
  });
  statusFilter?.addEventListener("change", () => {
    txActiveStatusFilter = statusFilter.value;
    renderTransactions();
  });

  renderTransactions(); // initial render on page load
}


/* -----------------------------------------------------------------
   9. VERIFICATION CENTER — Tier 1 / 2 / 3 upgrade flow
----------------------------------------------------------------- */
function initTierSystem() {
  const tierPillText = document.getElementById("tierPillText");
  // The Me section shows its own copies of the same tier info — kept in
  // sync here rather than given their own state, so there's still only
  // ONE source of truth (appState.tier) for which tier the account is on.
  const meTierPillText = document.getElementById("meTierPillText");
  const meKycPillText = document.getElementById("meKycPillText");
  function syncMeTierDisplays(tier) {
    if (meTierPillText) meTierPillText.textContent = `Tier ${tier} Verified`;
    if (meKycPillText) meKycPillText.textContent = `Tier ${tier}`;
  }

  /**
   * refreshUpgradeButton
   * Enables a tier's "Upgrade" button only once every checkbox in that
   * tier's checklist is ticked — mirrors real KYC flows where every
   * required document/step has to be completed before you can proceed.
   */
  function refreshUpgradeButton(tier) {
    const checks = document.querySelectorAll(`[data-tier-checklist="${tier}"] .dp-tier-check`);
    const allChecked = Array.from(checks).every((checkbox) => checkbox.checked);
    const upgradeBtn = document.querySelector(`[data-tier-upgrade="${tier}"]`);
    if (upgradeBtn) upgradeBtn.disabled = !allChecked;
  }

  // Any checkbox change re-evaluates whether that tier's upgrade button should unlock.
  document.querySelectorAll(".dp-tier-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => refreshUpgradeButton(checkbox.dataset.tier));
  });

  /**
   * unlockTierUI
   * Pure UI update, shared by upgradeToTier (the animated, "just clicked"
   * path) and restoreTierUI (the silent "log back in" path) below — marks
   * a tier Complete and, if there's a next tier, unlocks its checklist.
   */
  function unlockTierUI(tier) {
    const completedStatus = document.querySelector(`[data-tier-status="${tier}"]`);
    completedStatus.textContent = "Complete";
    completedStatus.className = "dp-tier-status dp-tier-status-complete";
    document.querySelector(`[data-tier-upgrade="${tier}"]`)?.classList.add("d-none");

    const nextTier = tier + 1;
    const nextStatus = document.querySelector(`[data-tier-status="${nextTier}"]`);
    if (nextStatus) {
      nextStatus.textContent = "Current";
      nextStatus.className = "dp-tier-status dp-tier-status-current";
      document.querySelectorAll(`[data-tier-checklist="${nextTier}"] .dp-tier-check`).forEach((checkbox) => {
        checkbox.disabled = false;
      });
      document.querySelector(`[data-tier-lock-note="${nextTier}"]`)?.classList.add("d-none");
    }
  }

  /**
   * upgradeToTier
   * The "user just clicked Upgrade" path: updates the UI, plays a chime,
   * and — new — saves the new tier into appState so it's still there
   * next time this account logs in.
   */
  function upgradeToTier(tier) {
    tierPillText.textContent = `Tier ${tier} Verified`;
    syncMeTierDisplays(tier);
    unlockTierUI(tier);
    appState.tier = tier;
    persistState();
    playChime(950); // a clearly "bigger" success tone than the usual 920, for a milestone moment
  }

  document.querySelector('[data-tier-upgrade="2"]').addEventListener("click", () => upgradeToTier(2));
  document.querySelector('[data-tier-upgrade="3"]').addEventListener("click", () => upgradeToTier(3));

  // Returning user: silently replay whatever tiers were already completed,
  // with no chime/animation — this just restores the saved state on load.
  if (appState.tier > 1) {
    tierPillText.textContent = `Tier ${appState.tier} Verified`;
    syncMeTierDisplays(appState.tier);
    for (let t = 2; t <= appState.tier; t++) {
      unlockTierUI(t);
    }
  } else {
    syncMeTierDisplays(1);
  }
}


