/* =================================================================
   DUBEMPAY — ui.js
   =================================================================
   Loaded fourth (last, before core.js's DOMContentLoaded listener
   actually fires and boots everything). Page chrome and navigation:
   the topbar search, Quick Services, Customer Care, and the sidebar
   (off-canvas toggle + scrollspy). Rewards/Savings and the
   transactions/subscriptions data those searches filter both live in
   features.js — this file wires the search INPUT, features.js exposes
   the filter functions it calls.
   ================================================================= */


/* -----------------------------------------------------------------
   9a. TOPBAR SEARCH — filters Recent Transactions + Subscriptions live
----------------------------------------------------------------- */
function initSearch() {
  const input = document.getElementById("dpSearchInput");

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();

    // txSearchQuery / renderTransactionsFromState are set up in features.js
    // (initTransactions) — guarded here in case that module hasn't run yet
    // for any reason, so a stray keystroke never throws.
    txSearchQuery = query;
    renderTransactionsFromState?.();

    filterSubscriptionCards(query);

    // Quick Services + Savings shortcuts (both use .dp-quick-item) and the
    // Rewards vouchers/Daily Bonus rows all sit in icon grids or short
    // lists rather than a re-rendered table, so — unlike transactions/
    // subscriptions — we DIM non-matches instead of removing them. Hiding
    // grid items would leave visually broken gaps; dimming keeps the
    // layout intact while still making matches obvious.
    document.querySelectorAll(".dp-quick-item[data-label]").forEach((btn) => {
      const label = btn.dataset.label.toLowerCase();
      btn.classList.toggle("dp-dimmed", Boolean(query) && !label.includes(query));
    });

    document.querySelectorAll(".dp-bonus-row").forEach((row) => {
      const title = row.querySelector(".dp-bonus-title")?.textContent.toLowerCase() || "";
      row.classList.toggle("dp-dimmed", Boolean(query) && !title.includes(query));
    });

    document.querySelectorAll(".dp-voucher-row").forEach((row) => {
      const title = row.querySelector(".dp-voucher-title")?.textContent.toLowerCase() || "";
      row.classList.toggle("dp-dimmed", Boolean(query) && !title.includes(query));
    });
  });
}


/* -----------------------------------------------------------------
   10. QUICK SERVICES + PROMOTIONS (demo-only buttons)
----------------------------------------------------------------- */
function initQuickServices() {
  document.querySelectorAll(".dp-quick-item").forEach((btn) => {
    // Buttons that now open a real modal (see initServiceModals) shouldn't
    // also fire the generic "not wired up" toast — that would just be
    // a confusing double-message on top of a fully-built screen.
    if (btn.hasAttribute("data-bs-toggle")) return;
    btn.addEventListener("click", () => {
      showToast(`🔧 ${btn.dataset.label} — connect this to a real flow when you have one.`);
      playChime(700);
    });
  });

  document.querySelectorAll(".dp-promo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(`🔧 ${btn.dataset.label} — connect this to a real flow when you have one.`);
      fireCta(btn);
      playChime(700);
    });
  });
}


/* -----------------------------------------------------------------
   10f0. MOBILE DATA — plan table + modal logic
   DATA_PLANS pricing was gathered from public MTN/Airtel/Glo/T2 Mobile
   (T2 Mobile is 9mobile's current rebrand)/Smile plan-guide roundups
   (web-researched mid-2026) — see the "sources" list at the end of
   this comment. Nigerian telcos change prices without notice and vary
   offers by SIM/region, so treat these as REPRESENTATIVE, not live/
   official figures; the modal itself says as much (see #dataModal's
   source note in index.html). VITEL's public pricing wasn't findable
   at research time — its table is a small, clearly-modest placeholder
   set kept consistent in style with the others rather than invented
   precision.
   Cashback shown on every card is a flat illustrative 3.5% (typical
   of the SME-data-reseller cashback this app's Rewards section
   already features elsewhere) computed at render time, not a
   per-plan figure scraped from any one source.
   Sources consulted: naijasabi.com.ng (MTN/Airtel/Glo 2026 guides),
   mtn.ng/data, shelaf.net, 360gadgetsafrica.com, wtec.org.ng data
   comparator, dataphyte.substack.com weekly-plan comparison,
   mobility.com.ng (T2 Mobile), mexc.com news roundup (Glo/T2 Mobile
   codes), smile.com.ng / vtpass.com / blog.vtuking.ng (Smile).
----------------------------------------------------------------- */
const DATA_PLANS = {
  MTN: {
    hot: [
      { size: "1GB", duration: "1 Day", price: 5 },
      { size: "1.5GB", duration: "7 Days", price: 10 },
      { size: "10GB", duration: "30 Days", price: 45 },
      { size: "16.5GB", duration: "30 Days", price: 65, tag: "Best value" },
    ],
    night: [
      { size: "500MB", duration: "12am\u20135am", price: 0.75, tag: "MTN Pulse only" },
      { size: "1GB", duration: "12am\u20135am", price: 1.5, tag: "MTN Pulse only" },
    ],
    daily: [
      { size: "100MB", duration: "1 Day", price: 1 },
      { size: "200MB", duration: "1 Day", price: 2 },
      { size: "500MB", duration: "1 Day", price: 3.5 },
      { size: "1GB", duration: "1 Day", price: 5 },
    ],
    weekly: [
      { size: "1.2GB", duration: "7 Days", price: 7, tag: "Pulse only" },
      { size: "1.5GB", duration: "7 Days", price: 10 },
      { size: "3.5GB", duration: "7 Days", price: 15 },
      { size: "11GB", duration: "7 Days", price: 35 },
    ],
    monthly: [
      { size: "2GB", duration: "30 Days", price: 15, tag: "+2mins+YouTube" },
      { size: "2.7GB", duration: "30 Days", price: 20, tag: "+2mins+YouTube" },
      { size: "3.5GB", duration: "30 Days", price: 25, tag: "+5mins+YouTube" },
      { size: "7GB", duration: "30 Days", price: 35 },
      { size: "10GB", duration: "30 Days", price: 45 },
      { size: "16.5GB", duration: "30 Days", price: 65 },
      { size: "36GB", duration: "30 Days", price: 110 },
    ],
    yearly: [
      { size: "120GB", duration: "365 Days", price: 500 },
      { size: "200GB", duration: "365 Days", price: 800 },
      { size: "400GB", duration: "365 Days", price: 1000 },
      { size: "800GB", duration: "365 Days", price: 1250, tag: "Best $/GB" },
    ],
  },
  Airtel: {
    hot: [
      { size: "5GB", duration: "7 Days", price: 15, tag: "+2GB YouTube" },
      { size: "10GB", duration: "30 Days", price: 40 },
      { size: "200GB", duration: "365 Days", price: 200, tag: "Best $/GB" },
    ],
    night: [
      { size: "250MB", duration: "12am\u20135am", price: 0.25, tag: "SmartTRYBE" },
      { size: "500MB", duration: "12am\u20135am", price: 0.5, tag: "SmartTRYBE" },
    ],
    daily: [
      { size: "100MB", duration: "1 Day", price: 1 },
      { size: "350MB", duration: "2 Days", price: 2 },
      { size: "1GB", duration: "1 Day", price: 3.5 },
    ],
    weekly: [
      { size: "1.5GB", duration: "7 Days", price: 4.8 },
      { size: "3.7GB", duration: "7 Days", price: 10 },
      { size: "5GB", duration: "7 Days", price: 15, tag: "+2GB YouTube" },
    ],
    monthly: [
      { size: "2GB", duration: "30 Days", price: 15 },
      { size: "4GB", duration: "30 Days", price: 25 },
      { size: "8GB", duration: "30 Days", price: 30 },
      { size: "10GB", duration: "30 Days", price: 40 },
      { size: "18GB", duration: "30 Days", price: 60 },
      { size: "25GB", duration: "30 Days", price: 80 },
    ],
    yearly: [
      { size: "50GB", duration: "365 Days", price: 60 },
      { size: "100GB", duration: "365 Days", price: 110 },
      { size: "200GB", duration: "365 Days", price: 200, tag: "Best $/GB" },
    ],
  },
  GLO: {
    hot: [
      { size: "3.7GB", duration: "7 Days", price: 10, tag: "Best value" },
      { size: "10.5GB", duration: "30 Days", price: 30 },
      { size: "1000GB", duration: "365 Days", price: 1500, tag: "Best $/GB" },
    ],
    night: [{ size: "750MB", duration: "12am\u20135am", price: 0.5 }],
    daily: [
      { size: "45MB", duration: "1 Day", price: 0.5 },
      { size: "125MB", duration: "1 Day", price: 1 },
      { size: "275MB", duration: "1 Day", price: 2 },
      { size: "1GB", duration: "1 Day", price: 3.5, tag: "Special" },
      { size: "2GB", duration: "1 Day", price: 5, tag: "Special" },
    ],
    weekly: [
      { size: "1.55GB", duration: "7 Days", price: 5 },
      { size: "3.7GB", duration: "7 Days", price: 10 },
      { size: "6GB", duration: "7 Days", price: 15 },
    ],
    monthly: [
      { size: "2.6GB", duration: "30 Days", price: 10 },
      { size: "5.2GB", duration: "30 Days", price: 15 },
      { size: "6.25GB", duration: "30 Days", price: 20 },
      { size: "7.25GB", duration: "30 Days", price: 25 },
      { size: "10.5GB", duration: "30 Days", price: 30 },
      { size: "12.5GB", duration: "30 Days", price: 40 },
      { size: "16.5GB", duration: "30 Days", price: 50 },
      { size: "20.5GB", duration: "30 Days", price: 60 },
    ],
    yearly: [
      { size: "355GB", duration: "90 Days", price: 600, tag: "3-Month" },
      { size: "1000GB", duration: "365 Days", price: 1500, tag: "Best $/GB" },
    ],
  },
  "T2 Mobile": {
    hot: [
      { size: "3.5GB", duration: "7 Days", price: 15 },
      { size: "1.65GB", duration: "30 Days", price: 20, tag: "+65 mins" },
    ],
    night: [{ size: "500MB", duration: "12am\u20135am", price: 0.6 }],
    daily: [{ size: "100MB", duration: "1 Day", price: 1 }],
    weekly: [
      { size: "350MB", duration: "7 Days", price: 5, tag: "+16 mins" },
      { size: "700MB", duration: "14 Days", price: 10, tag: "+35 mins" },
      { size: "50MB", duration: "7 Days", price: 0.25, tag: "Facebook only" },
    ],
    monthly: [
      { size: "1.65GB", duration: "30 Days", price: 20, tag: "+65 mins, Moreflex Plus" },
      { size: "50GB", duration: "30 Days", price: 125 },
    ],
    yearly: [{ size: "200GB", duration: "365 Days", price: 500 }],
  },
  VITEL: {
    hot: [{ size: "1GB", duration: "1 Day", price: 3 }],
    night: [{ size: "500MB", duration: "12am\u20135am", price: 0.5 }],
    daily: [
      { size: "100MB", duration: "1 Day", price: 1 },
      { size: "1GB", duration: "1 Day", price: 3 },
    ],
    weekly: [{ size: "2.5GB", duration: "7 Days", price: 8 }],
    monthly: [
      { size: "5GB", duration: "30 Days", price: 15 },
      { size: "10GB", duration: "30 Days", price: 28 },
    ],
    yearly: [{ size: "100GB", duration: "365 Days", price: 250 }],
  },
  Smile: {
    hot: [
      { size: "1GB", duration: "30 Days", price: 10 },
      { size: "60GB", duration: "30 Days", price: 150, tag: "MaxiLite" },
    ],
    night: [{ size: "1GB", duration: "12am\u20135am", price: 1 }],
    daily: [{ size: "200MB", duration: "1 Day", price: 1.5 }],
    weekly: [{ size: "3GB", duration: "7 Days", price: 25 }],
    monthly: [
      { size: "1GB", duration: "30 Days", price: 10 },
      { size: "2GB", duration: "30 Days", price: 20 },
      { size: "60GB", duration: "30 Days", price: 150, tag: "MaxiLite" },
      { size: "220GB", duration: "30 Days", price: 385, tag: "Maxi Home" },
    ],
    yearly: [{ size: "200GB", duration: "365 Days", price: 1350 }],
  },
};


/* -----------------------------------------------------------------
   10ez. AIRTIME MODAL — network picker (shares the same 6 real
   networks as Data), a discounted top-up grid, and a "Recommend
   Airtime Offers" flash-deal strip with live claim progress.
   Unlike mobile data, airtime top-up cashback/discount is a promo
   run by the app itself rather than something that differs by
   carrier, so — matching how the real OPay/PalmPay screen this was
   modeled on works — the same top-up grid and offers apply no
   matter which of the 6 networks is selected; only the network pill
   and USSD dial code change. Numbers mirror the reference screenshot
   ($50→$1.75 cashback, $200 discounted to $101, etc.).
----------------------------------------------------------------- */
const AIRTIME_NETWORKS = ["MTN", "Airtel", "GLO", "T2 Mobile", "VITEL", "Smile"];

const AIRTIME_TOPUPS = [
  { amount: 50, cashback: 1.75 },
  { amount: 100, cashback: 3.5 },
  { amount: 200, cashback: 7, pay: 101 },
  { amount: 500, cashback: 10, pay: 401 },
  { amount: 1000, cashback: 20, pay: 901 },
  { amount: 2000, cashback: 40, pay: 1901 },
];

const AIRTIME_FLASH_OFFERS = [
  { label: "Buy $100 Airtime, pay $1", was: 100, price: 1, claimed: 5136, total: 10000 },
  { label: "Buy $200 Airtime, pay $5", was: 200, price: 5, claimed: 3210, total: 8000 },
];

function initAirtimeModal() {
  const pill = document.getElementById("airtimeNetworkPill");
  const logo = document.getElementById("airtimeNetworkLogo");
  const menu = document.getElementById("airtimeNetworkMenu");
  const dialCode = document.getElementById("airtimeDialCode");
  const grid = document.getElementById("airtimeAmountGrid");
  const flashWrap = document.getElementById("airtimeFlashOffers");
  if (!pill || !grid) return;

  let activeNetwork = AIRTIME_NETWORKS[0];

  menu.innerHTML = AIRTIME_NETWORKS.map(
    (name) => `<li><button class="dropdown-item" type="button" data-network="${name}">${name}</button></li>`
  ).join("");
  menu.querySelector(`[data-network="${activeNetwork}"]`)?.classList.add("active");

  menu.querySelectorAll("[data-network]").forEach((item) => {
    item.addEventListener("click", () => {
      activeNetwork = item.dataset.network;
      logo.textContent = activeNetwork;
      dialCode.textContent = `*312*3*amount# (${activeNetwork})`;
      menu.querySelectorAll("[data-network]").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Top-up grid — click-to-select wiring is handled generically for every
  // .dp-amount-grid by initServiceModals() (which runs right after this),
  // so this just needs to render the markup.
  grid.innerHTML = AIRTIME_TOPUPS.map(
    (t) => `
      <button type="button" class="dp-amount-btn" data-amount="${t.amount}">
        <span class="dp-amount-cashback">$${t.cashback} Cashback</span>
        <span>$${t.amount.toLocaleString()}</span>
        ${t.pay ? `<span class="dp-amount-pay">Pay $${t.pay.toLocaleString()}</span>` : ""}
      </button>
    `
  ).join("");

  // Recommend Airtime Offers — flash cards with a claim-progress bar
  function renderFlashOffers() {
    flashWrap.innerHTML = AIRTIME_FLASH_OFFERS.map((offer, i) => {
      const pct = Math.min(100, Math.round((offer.claimed / offer.total) * 100));
      return `
        <div class="dp-flash-offer-card">
          <p class="dp-flash-offer-title mb-0">${offer.label}</p>
          <div class="dp-flash-offer-price-row">
            <span class="dp-flash-offer-price">$${offer.price}</span>
            <span class="dp-flash-offer-was">$${offer.was}</span>
          </div>
          <button type="button" class="btn dp-btn-primary btn-sm dp-flash-offer-get-btn" data-offer-index="${i}">Get</button>
          <div class="dp-flash-offer-progress-track">
            <div class="dp-flash-offer-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="dp-flash-offer-claimed">${offer.claimed.toLocaleString()} claimed</span>
        </div>
      `;
    }).join("");

    flashWrap.querySelectorAll("[data-offer-index]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const offer = AIRTIME_FLASH_OFFERS[Number(btn.dataset.offerIndex)];
        const success = await withButtonLoading(btn, { loadingText: "Claiming…" });
        if (success) {
          offer.claimed = Math.min(offer.total, offer.claimed + 1);
          showToast(`✅ ${offer.label} claimed for ${activeNetwork}.`);
          playChime(920);
          renderFlashOffers();
        }
      });
    });
  }
  renderFlashOffers();
}


/* -----------------------------------------------------------------
   3a. ELECTRICITY
   Nigeria's 11 licensed discos (the ones you'd actually see in a real
   bills app), plus 2 "solar"/newer entrants shown in the reference
   screenshots. initials/color are just for the round avatar badge —
   this is a demo, so there are no real logo assets to load.
----------------------------------------------------------------- */
const DISCO_PROVIDERS = [
  { id: "ibadan", name: "Ibadan Electricity", initials: "IB", color: "#2f6fed" },
  { id: "jos", name: "Jos Electricity", initials: "JD", color: "#6b4fd6" },
  { id: "portharcourt", name: "Port Harcourt Electricity", initials: "PH", color: "#0891b2" },
  { id: "kaduna", name: "Kaduna Electricity", initials: "KD", color: "#16a34a" },
  { id: "ikeja", name: "Ikeja Electricity", initials: "IE", color: "#dc2626" },
  { id: "abuja", name: "Abuja Electricity", initials: "AE", color: "#1d4ed8" },
  { id: "eko", name: "Eko Electricity", initials: "EK", color: "#7c3aed" },
  { id: "enugu", name: "Enugu Electricity", initials: "EN", color: "#e11d48" },
  { id: "kano", name: "Kano Electricity", initials: "KN", color: "#4338ca" },
  { id: "benin", name: "Benin Electricity", initials: "BN", color: "#059669" },
  { id: "startimes", name: "Startimes Energy", initials: "ST", color: "#ea580c" },
  { id: "yola", name: "Yola Electricity", initials: "YE", color: "#f43f5e", isNew: true },
  { id: "aba", name: "Aba Electricity", initials: "AB", color: "#ca8a04" },
];

const ELECTRICITY_AMOUNTS = [100, 200, 300, 500, 1000, 2000];

// Small deterministic pool used to fake a "customer name lookup" once a
// meter number looks complete — same digits always resolve to the same
// name so a demo/test isn't surprised by a random result on every run.
const ELECTRICITY_DEMO_NAMES = [
  "Adaeze Okonkwo", "Ibrahim Musa", "Chinedu Obi", "Fatima Bello",
  "Emeka Nwosu", "Aisha Suleiman", "Oluwaseun Adebayo", "Ngozi Eze",
];

function initElectricityModal() {
  const providerIcon = document.getElementById("electricityProviderIcon");
  const providerName = document.getElementById("electricityProviderName");
  const providerList = document.getElementById("electricityProviderList");
  const grid = document.getElementById("electricityAmountGrid");
  const meterInput = document.getElementById("electricityMeter");
  const meterVerified = document.getElementById("electricityMeterVerified");
  const tabs = document.querySelectorAll(".dp-auth-tab[data-elec-tab]");
  const prepaidAmounts = document.getElementById("electricityPrepaidAmounts");
  if (!providerList || !grid) return;

  let activeProvider = DISCO_PROVIDERS[0];

  function renderProviderList() {
    providerList.innerHTML = DISCO_PROVIDERS.map((p) => `
      <button type="button" class="dp-help-item${p.id === activeProvider.id ? " active" : ""}" data-provider-id="${p.id}">
        <span class="dp-provider-select-icon" style="background:${p.color};">${p.initials}</span>
        <span>
          <span class="dp-help-item-title d-block">${p.name}${p.isNew ? '<span class="dp-help-item-badge-new">NEW</span>' : ""}</span>
        </span>
        <i class="bi ${p.id === activeProvider.id ? "bi-check-circle-fill" : "bi-circle"} dp-provider-select-check"></i>
      </button>
    `).join("");

    providerList.querySelectorAll("[data-provider-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeProvider = DISCO_PROVIDERS.find((p) => p.id === btn.dataset.providerId) || activeProvider;
        providerIcon.textContent = activeProvider.initials;
        providerIcon.style.background = activeProvider.color;
        providerName.textContent = activeProvider.name;
        renderProviderList();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("electricityProviderModal")).hide();
        playChime(760);
      });
    });
  }
  renderProviderList();

  // Amount grid — click-to-select is wired generically for every
  // .dp-amount-grid by initServiceModals(); this just renders the markup.
  grid.innerHTML = ELECTRICITY_AMOUNTS.map(
    (amt) => `
      <button type="button" class="dp-amount-btn" data-amount="${amt}">
        <span>$${amt.toLocaleString()}</span>
        <span class="dp-amount-pay">Pay $${amt.toLocaleString()}</span>
      </button>
    `
  ).join("");

  // Prepaid / Postpaid — postpaid bills don't have a preset amount grid
  // in the reference app, just a plain "enter amount" field.
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isPostpaid = tab.dataset.elecTab === "postpaid";
      prepaidAmounts.classList.toggle("d-none", isPostpaid);
      document.getElementById("electricityAmountLabel").textContent = isPostpaid ? "Amount" : "Or enter an amount";
    });
  });

  // Simulated "meter number lookup" — once it looks like a complete
  // meter number, resolve it to a (deterministic, fake) customer name
  // so the flow feels real instead of just accepting anything typed.
  meterInput?.addEventListener("input", () => {
    const digits = meterInput.value.replace(/\D/g, "");
    meterInput.value = digits;
    if (digits.length >= 10) {
      const sum = digits.split("").reduce((a, d) => a + Number(d), 0);
      const name = ELECTRICITY_DEMO_NAMES[sum % ELECTRICITY_DEMO_NAMES.length];
      meterVerified.textContent = `✅ Verified: ${name}`;
      meterVerified.classList.remove("d-none");
    } else {
      meterVerified.classList.add("d-none");
    }
  });
}

function initDataModal() {
  const pill = document.getElementById("dataNetworkPill");
  const logo = document.getElementById("dataNetworkLogo");
  const menu = document.getElementById("dataNetworkMenu");
  const tabsWrap = document.getElementById("dataCategoryTabs");
  const grid = document.getElementById("dataPlanGrid");
  if (!pill || !grid) return;

  const networks = Object.keys(DATA_PLANS);
  let activeNetwork = networks[0];
  let activeCategory = "hot";

  // Build the network dropdown once from DATA_PLANS — adding a network
  // later only means editing the table above, not this markup too.
  menu.innerHTML = networks
    .map((name) => `<li><button class="dropdown-item" type="button" data-network="${name}">${name}</button></li>`)
    .join("");

  function renderGrid() {
    const plans = DATA_PLANS[activeNetwork]?.[activeCategory] || [];
    if (!plans.length) {
      grid.innerHTML = `<p class="dp-mini-copy mb-0">No ${activeCategory} plans listed for ${activeNetwork} yet.</p>`;
      return;
    }
    grid.innerHTML = plans
      .map((plan) => {
        const cashback = Math.max(1, Math.round(plan.price * 0.035));
        const sizeMatch = plan.size.match(/([\d.]+)([A-Za-z]+)/);
        const num = sizeMatch ? sizeMatch[1] : plan.size;
        const unit = sizeMatch ? sizeMatch[2] : "";
        return `
          <button type="button" class="dp-data-plan-card" data-price="${plan.price}" data-plan-size="${plan.size}" data-plan-duration="${plan.duration}">
            <p class="dp-data-plan-size mb-0">${num}<sup>${unit}</sup></p>
            <p class="dp-data-plan-duration mb-0">${plan.duration}</p>
            <p class="dp-data-plan-price mb-0">$${plan.price.toLocaleString()}</p>
            <p class="dp-data-plan-cashback mb-0">$${cashback} cashback</p>
            ${plan.tag ? `<span class="dp-data-plan-tag">${plan.tag}</span>` : ""}
          </button>
        `;
      })
      .join("");

    grid.querySelectorAll(".dp-data-plan-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const price = Number(card.dataset.price);
        const success = await withButtonLoading(card, { loadingText: "Processing…" });
        if (success) {
          showSuccessPage({
            title: "Data Purchase Successful",
            amount: `$${price.toLocaleString()}`,
            details: [
              { label: "Network", value: activeNetwork },
              { label: "Plan", value: `${card.dataset.planSize} · ${card.dataset.planDuration}` },
              { label: "Reference", value: generateRef() },
            ],
          });
        } else {
          showToast("❌ That didn't go through — check the details and try again.", "error");
          playChime(500);
        }
      });
    });
  }

  // Network picker
  menu.querySelectorAll("[data-network]").forEach((item) => {
    item.addEventListener("click", () => {
      activeNetwork = item.dataset.network;
      logo.textContent = activeNetwork;
      menu.querySelectorAll("[data-network]").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      renderGrid();
    });
  });
  menu.querySelector(`[data-network="${activeNetwork}"]`)?.classList.add("active");

  // Category tabs
  tabsWrap.querySelectorAll("[data-data-category]").forEach((tab) => {
    tab.addEventListener("click", () => {
      tabsWrap.querySelectorAll("[data-data-category]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = tab.dataset.dataCategory;
      renderGrid();
    });
  });

  renderGrid();
}


/* -----------------------------------------------------------------
   10f. SERVICE MODALS — Airtime / Betting / TV / Loan / Fixed /
   Transfer-to-Bank / Transfer-to-Wallet / Withdraw / Success Rate /
   All Services. All demo-only: forms validate and "submit" with the
   same honest toast + loading-state pattern used everywhere else in
   this app, they just don't hit a real payments backend.
----------------------------------------------------------------- */
/* -----------------------------------------------------------------
   10f1. SAVINGS PRODUCTS — OWealth / SafeBox (+ Set SafeBox wizard) /
   Targets (+ Create Target wizard) / Spend & Save / BizPayment.
   Everything reads from and writes to appState.savings, which starts
   fully zeroed for a real account and pre-seeded (OWealth only) for
   the demo account — see getDefaultAppState() in core.js.
----------------------------------------------------------------- */
function initSavingsProducts() {
  const s = () => appState.savings; // shorthand — always read live, appState can change between calls

  function renderActivityList(containerId, items, emptyText) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items || !items.length) {
      el.innerHTML = `<p class="dp-mini-copy text-center py-3 mb-0">${emptyText}</p>`;
      return;
    }
    el.innerHTML = items
      .map((item) => {
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
      })
      .join("");
  }

  /* ---------------- OWEALTH ---------------- */
  function renderOwealth() {
    document.getElementById("owealthBalance").textContent = formatMoney(s().oWealth);
    document.getElementById("owealthInterestToday").textContent = "+" + formatMoney(s().oWealthInterestToday);
    renderActivityList("owealthActivityList", s().oWealthActivity, "No activity yet — deposits and interest will show up here.");
    updateOwealthSplitter();

    // Two-tier rate breakdown: the first $50 earns 15% p.a., anything
    // above that only earns 5% p.a. — matches the "Optimize & Get Higher
    // Returns" nudge just below it, which exists specifically because
    // balances over $50 are earning the lower rate.
    const HIGH_TIER_CAP = 50;
    const total = s().oWealth;
    const highTierAmt = Math.min(total, HIGH_TIER_CAP);
    const lowTierAmt = Math.max(0, total - HIGH_TIER_CAP);
    document.getElementById("owealthTierHighAmt").textContent = formatMoney(highTierAmt);
    document.getElementById("owealthTierLowAmt").textContent = formatMoney(lowTierAmt);
  }

  function updateOwealthSplitter() {
    const slider = document.getElementById("owealthSplitter");
    const transferEl = document.getElementById("owealthTransferAmt");
    const keepEl = document.getElementById("owealthKeepAmt");
    if (!slider) return;
    const pct = Number(slider.value);
    const total = s().oWealth;
    const transferAmt = total * (pct / 100);
    transferEl.textContent = formatMoney(transferAmt);
    keepEl.textContent = formatMoney(total - transferAmt);
  }
  document.getElementById("owealthSplitter")?.addEventListener("input", updateOwealthSplitter);

  document.getElementById("owealthSaveNowBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("owealthSaveNowBtn");
    const slider = document.getElementById("owealthSplitter");
    const pct = Number(slider.value);
    if (s().oWealth <= 0 || pct === 0) {
      showToast("Nothing to move yet — add funds to OWealth first.", "error");
      return;
    }
    const success = await withButtonLoading(btn, { loadingText: "Saving…" });
    if (success) {
      const transferAmt = s().oWealth * (pct / 100);
      s().safeBox += transferAmt;
      s().oWealth -= transferAmt;
      persistState();
      renderOwealth();
      renderSafebox();
      showSuccessPage({
        title: "Moved to SafeBox",
        amount: formatMoney(transferAmt),
        details: [{ label: "From", value: "OWealth" }, { label: "Reference", value: generateRef() }],
      });
    }
  });

  ["owealthWithdrawBtn", "owealthSaveBtn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      showToast(`🔧 ${id === "owealthSaveBtn" ? "Save to OWealth" : "Withdraw from OWealth"} — connect this to a real amount-entry flow when you have one.`);
      playChime(700);
    });
  });

  document.getElementById("owealthTierInfoBtn")?.addEventListener("click", () => {
    showToast("The first $50 in OWealth earns 15% p.a. — anything above that earns 5% p.a.");
  });

  /* ---------------- SAFEBOX ---------------- */
  function renderSafebox() {
    const el = document.getElementById("safeboxBalance");
    if (el) el.textContent = formatMoney(s().safeBox);
  }

  // Withdrawal-schedule card selection (Set SafeBox step 1)
  document.querySelectorAll(".dp-schedule-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".dp-schedule-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
    });
  });

  function goSafeboxStep(step) {
    document.querySelectorAll("[data-safebox-step]").forEach((panel) => {
      panel.classList.toggle("d-none", panel.dataset.safeboxStep !== String(step));
    });
    document.querySelectorAll("[data-step-dot]").forEach((dot) => {
      const dotStep = Number(dot.dataset.stepDot);
      dot.classList.toggle("active", dotStep === step);
      dot.classList.toggle("done", dotStep < step);
    });
  }

  document.getElementById("safeboxStep1NextBtn")?.addEventListener("click", () => {
    const chosen = document.querySelector(".dp-schedule-card.active");
    s().safeBoxSchedule = chosen?.dataset.schedule || "quarterly";
    goSafeboxStep(2);
  });

  document.getElementById("safeboxAutosaveForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amountInput = document.getElementById("safeboxAmount");
    const frequency = document.getElementById("safeboxFrequency");
    const funding = document.getElementById("safeboxFunding");
    const amount = Number(amountInput.value);

    let valid = true;
    [amountInput, frequency, funding].forEach((el) => {
      const ok = el === amountInput ? amount > 0 : el.value;
      el.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) return;

    const btn = document.getElementById("safeboxConfirmBtn");
    const success = await withButtonLoading(btn, { loadingText: "Setting up…" });
    if (success) {
      s().safeBox += amount;
      persistState();
      renderSafebox();
      showToast(`✅ SafeBox AutoSave set — ${formatMoney(amount)} ${frequency.value} into a ${s().safeBoxSchedule} SafeBox.`);
      playChime(920);
      bootstrap.Modal.getInstance(document.getElementById("setSafeboxModal"))?.hide();
    }
  });

  document.getElementById("setSafeboxModal")?.addEventListener("hidden.bs.modal", () => {
    goSafeboxStep(1);
    document.getElementById("safeboxAutosaveForm")?.reset();
    document.querySelectorAll("#setSafeboxModal .is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  });

  /* ---------------- TARGETS ---------------- */
  let targetsActiveTab = "active";

  function renderTargetsList() {
    const list = s().targetsList.filter((t) => t.status === targetsActiveTab);
    const emptyText =
      targetsActiveTab === "active"
        ? "There are currently no Active Target"
        : "There are currently no Ended Target";
    if (!list.length) {
      document.getElementById("myTargetsList").innerHTML = `
        <div class="dp-modal-empty-illustration">
          <span class="dp-modal-empty-icon-wrap"><i class="bi bi-clipboard-x"></i></span>
          <p>${emptyText}</p>
        </div>
      `;
      return;
    }
    document.getElementById("myTargetsList").innerHTML = list
      .map(
        (t) => `
        <div class="dp-plan-card">
          <div class="dp-plan-card-row mb-1">
            <span class="dp-bonus-title mb-0">${escapeHTML(t.name)}</span>
            <span class="dp-mini-copy">${escapeHTML(t.frequency)}</span>
          </div>
          <p class="dp-mini-copy mb-0">${formatMoney(t.saved)} saved of ${formatMoney(t.amount)} target</p>
        </div>
      `
      )
      .join("");
  }

  function renderTargets() {
    document.getElementById("targetsBalance").textContent = formatMoney(s().targets);
    renderTargetsList();
  }

  document.getElementById("findTargetsMoreBtn")?.addEventListener("click", () => {
    showToast("🔧 More Targets — connect this to a real target-catalog flow when you have one.");
    playChime(700);
  });

  document.querySelectorAll("[data-targets-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-targets-tab]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      targetsActiveTab = tab.dataset.targetsTab;
      renderTargetsList();
    });
  });

  // "Find Targets" cards jump straight into Create Target with the name pre-filled
  document.querySelectorAll(".dp-find-target-card").forEach((card) => {
    card.addEventListener("click", () => {
      bootstrap.Modal.getInstance(document.getElementById("targetsModal"))?.hide();
      const createModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("createTargetModal"));
      createModal.show();
      // Wait for the modal's own reset (hidden.bs.modal on the PREVIOUS
      // close already fired) before pre-filling, so our value sticks.
      setTimeout(() => {
        document.getElementById("ctName").value = card.dataset.targetName;
      }, 50);
    });
  });

  /* ---------------- CREATE TARGET ---------------- */
  let ctSelectedCategory = "";
  let ctSelectedFrequency = "Daily";

  document.querySelectorAll("#createTargetForm .dp-category-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#createTargetForm .dp-category-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      ctSelectedCategory = chip.dataset.category;
      // Picking a quick chip and picking from the "Target Category"
      // dropdown are two ways to set the same thing — a chip click resets
      // the dropdown back to "Optional" so the two never disagree.
      const select = document.getElementById("ctCategorySelect");
      if (select) select.value = "";
    });
  });
  document.getElementById("ctCategorySelect")?.addEventListener("change", (e) => {
    if (e.target.value) {
      document.querySelectorAll("#createTargetForm .dp-category-chip").forEach((c) => c.classList.remove("active"));
      ctSelectedCategory = e.target.value;
    }
  });
  document.querySelectorAll("[data-ct-frequency]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-ct-frequency]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      ctSelectedFrequency = tab.dataset.ctFrequency;
    });
  });

  document.getElementById("ctCustomDeductionToggle")?.addEventListener("change", (e) => {
    document.getElementById("ctCustomDeductionTimeWrap")?.classList.toggle("d-none", !e.target.checked);
  });

  function goCtStep(step) {
    document.querySelectorAll("[data-ct-step]").forEach((panel) => {
      panel.classList.toggle("d-none", panel.dataset.ctStep !== String(step));
    });
    document.querySelectorAll("[data-ct-step-dot]").forEach((dot) => {
      const dotStep = Number(dot.dataset.ctStepDot);
      dot.classList.toggle("active", dotStep === step);
      dot.classList.toggle("done", dotStep < step);
    });
  }

  document.getElementById("ctStep1NextBtn")?.addEventListener("click", () => {
    const form = document.getElementById("createTargetForm");
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    document.getElementById("ctReviewName").textContent = document.getElementById("ctName").value;
    document.getElementById("ctReviewCategory").textContent = ctSelectedCategory || "—";
    document.getElementById("ctReviewAmount").textContent = formatMoney(Number(document.getElementById("ctAmount").value));
    document.getElementById("ctReviewFrequency").textContent = ctSelectedFrequency;
    const start = document.getElementById("ctStartDate").value;
    const maturity = document.getElementById("ctMaturityDate").value;
    document.getElementById("ctReviewDates").textContent = `${start || "—"} → ${maturity || "—"}`;

    const deductionRow = document.getElementById("ctReviewDeductionRow");
    if (document.getElementById("ctCustomDeductionToggle")?.checked) {
      document.getElementById("ctReviewDeduction").textContent = document.getElementById("ctCustomDeductionTime").value;
      deductionRow.style.display = "";
    } else {
      deductionRow.style.display = "none";
    }

    goCtStep(2);
  });

  document.getElementById("ctBackBtn")?.addEventListener("click", () => goCtStep(1));

  document.getElementById("ctCreateBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("ctCreateBtn");
    const success = await withButtonLoading(btn, { loadingText: "Creating…" });
    if (success) {
      s().targetsList.push({
        name: document.getElementById("ctName").value,
        category: ctSelectedCategory,
        amount: Number(document.getElementById("ctAmount").value),
        saved: 0,
        frequency: ctSelectedFrequency,
        status: "active",
      });
      persistState();
      renderTargets();
      showToast(`✅ "${document.getElementById("ctName").value}" target created.`);
      playChime(920);
      bootstrap.Modal.getInstance(document.getElementById("createTargetModal"))?.hide();
    }
  });

  document.getElementById("createTargetModal")?.addEventListener("hidden.bs.modal", () => {
    goCtStep(1);
    const form = document.getElementById("createTargetForm");
    form?.reset(); // also resets ctCategorySelect and ctCustomDeductionToggle, since they're inside this <form>
    form?.classList.remove("was-validated");
    document.querySelectorAll("#createTargetForm .dp-category-chip, [data-ct-frequency]").forEach((el) => el.classList.remove("active"));
    document.querySelector('[data-ct-frequency="Daily"]')?.classList.add("active");
    document.getElementById("ctCustomDeductionTimeWrap")?.classList.add("d-none");
    ctSelectedCategory = "";
    ctSelectedFrequency = "Daily";
  });

  /* ---------------- SPEND & SAVE ---------------- */
  function renderSpendSave() {
    document.getElementById("spendSaveBalance").textContent = formatMoney(s().spendSave);
    document.getElementById("spendSaveInterest").textContent = formatMoney(s().spendSaveInterest);
    document.getElementById("spendSavePercent").textContent = s().spendSavePercent + "%";
    document.getElementById("spendSaveWeeklyTimes").innerHTML = `${s().spendSaveWeeklyTimes}<span style="font-size:0.9rem; font-weight:600;"> times</span>`;
    document.querySelectorAll("#spendSaveModal .dp-week-dots span").forEach((dot, i) => {
      dot.classList.toggle("filled", i < s().spendSaveWeeklyTimes);
    });
    renderActivityList("spendSaveActivityList", s().spendSaveActivity, "No activity yet.");
  }

  document.getElementById("spendSaveChangeBtn")?.addEventListener("click", () => {
    showToast("🔧 Change saving percentage — connect this to a real settings flow when you have one.");
    playChime(700);
  });
  document.getElementById("spendSaveWithdrawBtn")?.addEventListener("click", () => {
    if (s().spendSave <= 0) {
      showToast("Nothing to withdraw yet.", "error");
      return;
    }
    showToast("🔧 Withdraw from Spend & Save — connect this to a real amount-entry flow when you have one.");
    playChime(700);
  });

  /* ---------------- BIZPAYMENT ---------------- */
  let bizSellMode = "";
  let bizCategory = "";

  function goBizStep(step) {
    document.querySelectorAll("[data-biz-step]").forEach((panel) => {
      panel.classList.toggle("d-none", panel.dataset.bizStep !== String(step));
    });
  }
  function updateBizActivateState() {
    document.getElementById("bizActivateBtn").disabled = !(bizSellMode && bizCategory);
  }

  document.getElementById("bizStep1NextBtn")?.addEventListener("click", () => goBizStep(2));

  document.querySelectorAll("[data-biz-sell-mode]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-biz-sell-mode]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      bizSellMode = chip.dataset.bizSellMode;
      updateBizActivateState();
    });
  });
  document.querySelectorAll(".dp-biz-category").forEach((tile) => {
    tile.addEventListener("click", () => {
      document.querySelectorAll(".dp-biz-category").forEach((t) => t.classList.remove("active"));
      tile.classList.add("active");
      bizCategory = tile.dataset.bizCategory;
      updateBizActivateState();
    });
  });

  document.getElementById("bizActivateBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("bizActivateBtn");
    const success = await withButtonLoading(btn, { loadingText: "Activating…" });
    if (success) {
      showToast("✅ BizPayment activated — zero fees, free for life.");
      playChime(920);
      bootstrap.Modal.getInstance(document.getElementById("bizPaymentModal"))?.hide();
    }
  });

  document.getElementById("bizPaymentModal")?.addEventListener("hidden.bs.modal", () => {
    goBizStep(1);
    document.querySelectorAll("[data-biz-sell-mode], .dp-biz-category").forEach((el) => el.classList.remove("active"));
    bizSellMode = "";
    bizCategory = "";
    document.getElementById("bizActivateBtn").disabled = true;
  });

  /* ---------------- WITHDRAW ---------------- */
  function renderWithdrawAvailable() {
    const el = document.getElementById("withdrawAvailableBalance");
    if (el) el.textContent = formatMoney(appState.balance || 0);
  }
  document.getElementById("withdrawModal")?.addEventListener("show.bs.modal", renderWithdrawAvailable);

  function updateBalanceEverywhere() {
    persistState();
    renderBalance();
    renderCurrencyChips();
    plotBalanceSparkline();
    renderWithdrawAvailable();
  }

  document.getElementById("withdrawMerchantConfirmBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("withdrawMerchantAmount");
    const amount = Number(input.value);
    if (!amount || amount <= 0) {
      showToast("Enter an amount first.", "error");
      return;
    }
    if (amount > (appState.balance || 0)) {
      showToast("That's more than your available balance.", "error");
      return;
    }
    const btn = document.getElementById("withdrawMerchantConfirmBtn");
    const success = await withButtonLoading(btn, { loadingText: "Generating…" });
    if (success) {
      appState.balance -= amount;
      updateBalanceEverywhere();
      const code = String(Math.floor(1000 + Math.random() * 9000));
      document.getElementById("withdrawMerchantCode").textContent = code.split("").join(" ");
      document.getElementById("withdrawMerchantCodeWrap").classList.remove("d-none");
      showToast(`✅ Withdrawal code generated for ${formatMoney(amount)}.`);
      playChime(920);
      input.value = "";
    }
  });

  document.querySelectorAll("#withdrawCardForm .dp-amount-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("withdrawCardAmount").value = btn.dataset.amount;
    });
  });
  document.getElementById("withdrawCardConfirmBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("withdrawCardAmount");
    const amount = Number(input.value);
    if (!amount || amount <= 0) {
      showToast("Enter an amount first.", "error");
      return;
    }
    if (amount > (appState.balance || 0)) {
      showToast("That's more than your available balance.", "error");
      return;
    }
    const btn = document.getElementById("withdrawCardConfirmBtn");
    const success = await withButtonLoading(btn, { loadingText: "Dispensing…", successRate: 0.92 });
    if (success) {
      appState.balance -= amount;
      updateBalanceEverywhere();
      showSuccessPage({
        title: "Card Withdrawal Successful",
        amount: formatMoney(amount),
        details: [{ label: "Reference", value: generateRef() }],
      });
      input.value = "";
    } else {
      showToast("❌ Withdrawal declined — try a different amount or card.", "error");
      playChime(500);
    }
  });

  document.getElementById("withdrawModal")?.addEventListener("hidden.bs.modal", () => {
    document.getElementById("withdrawMerchantCodeWrap")?.classList.add("d-none");
    document.getElementById("withdrawMerchantAmount").value = "";
    document.getElementById("withdrawCardAmount").value = "";
    document.querySelectorAll("#withdrawModal .dp-settings-expand-body").forEach((body) => body.classList.add("d-none"));
  });

  /* ---------------- FLEX SAVE ---------------- */
  function renderFlexSave() {
    document.getElementById("flexSaveBalance").textContent = formatMoney(s().flexSave);
    document.getElementById("flexSaveInterest").textContent = "+" + formatMoney(s().flexSaveInterest);
    renderActivityList("flexSaveActivityList", s().flexSaveActivity, "No activity yet — deposits will show up here.");
  }

  document.getElementById("flexSaveDepositToggle")?.addEventListener("click", () => {
    document.getElementById("flexSaveDepositBody")?.classList.toggle("d-none");
  });
  document.querySelectorAll("#flexSaveDepositBody .dp-amount-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("flexSaveAmount").value = btn.dataset.amount;
    });
  });
  document.getElementById("flexSaveDepositConfirmBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("flexSaveAmount");
    const amount = Number(input.value);
    if (!amount || amount <= 0) {
      showToast("Enter an amount first.", "error");
      return;
    }
    const btn = document.getElementById("flexSaveDepositConfirmBtn");
    const success = await withButtonLoading(btn, { loadingText: "Saving…" });
    if (success) {
      s().flexSave += amount;
      s().flexSaveActivity.unshift({
        icon: "bi-arrow-down",
        type: "incoming",
        desc: "Flex Save Deposit",
        time: "Just now",
        amount,
        status: "Successful",
      });
      persistState();
      renderFlexSave();
      showSuccessPage({
        title: "Flex Save Deposit Successful",
        amount: formatMoney(amount),
        details: [{ label: "Reference", value: generateRef() }],
      });
      input.value = "";
      document.getElementById("flexSaveDepositBody")?.classList.add("d-none");
    }
  });
  document.getElementById("flexSaveWithdrawBtn")?.addEventListener("click", () => {
    if (s().flexSave <= 0) {
      showToast("Nothing to withdraw yet.", "error");
      return;
    }
    showToast("🔧 Withdraw from Flex Save — connect this to a real amount-entry flow when you have one.");
    playChime(700);
  });

  // Initial paint for everything that has a value the moment its modal
  // exists in the DOM (no need to wait for the modal to open first).
  renderOwealth();
  renderSafebox();
  renderTargets();
  renderSpendSave();
  renderFlexSave();
  renderWithdrawAvailable();
}


function initServiceModals() {
  // Provider pickers (Airtime network / Betting platform / TV bouquet):
  // clicking one just marks it active, same idea as the card/voucher tabs.
  document.querySelectorAll(".dp-provider-row").forEach((row) => {
    row.querySelectorAll(".dp-provider-item").forEach((item) => {
      item.addEventListener("click", () => {
        row.querySelectorAll(".dp-provider-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  });

  // Preset amount grids (Airtime / Betting): clicking a preset fills the
  // adjacent custom-amount field and highlights the chosen button.
  document.querySelectorAll(".dp-amount-grid").forEach((grid) => {
    const form = grid.closest("form");
    const customInput = form?.querySelector('input[type="number"]');
    grid.querySelectorAll(".dp-amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        grid.querySelectorAll(".dp-amount-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (customInput) customInput.value = btn.dataset.amount;
      });
    });
  });

  // Generic "submit a demo payment form" handler — shared by Airtime,
  // Betting, Electricity, and the two Transfer modals. Transfers get a
  // slightly lower success rate, same "real life" reasoning sendMoneyBtn
  // already uses. `buildReceipt(form)` returns the {title, message,
  // amount, details} shown on the full-page confirmation afterward —
  // falls back to a title-only receipt built from successMessage if a
  // form doesn't supply one.
  function wireDemoForm(formId, submitBtnId, successMessage, successRate = 1, buildReceipt = null) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      const btn = document.getElementById(submitBtnId);
      const modal = form.closest(".modal");
      // Captured BEFORE form.reset() wipes the fields.
      const receipt = buildReceipt ? buildReceipt(form) : null;
      const success = await withButtonLoading(btn, { loadingText: "Processing…", successRate });
      if (success) {
        bootstrap.Modal.getOrCreateInstance(modal).hide();
        form.reset();
        form.querySelectorAll(".dp-amount-btn.active").forEach((b) => b.classList.remove("active"));
        showSuccessPage(receipt || { title: successMessage.replace(/^✅\s*/, "") });
      } else {
        showToast("❌ That didn't go through — check the details and try again.", "error");
        playChime(500);
      }
    });
  }

  wireDemoForm("airtimeForm", "airtimeSubmitBtn", "✅ Airtime top-up successful.", 1, (form) => ({
    title: "Airtime Purchase Successful",
    amount: `$${Number(document.getElementById("airtimeCustomAmount").value || 0).toLocaleString()}`,
    details: [
      { label: "Network", value: document.getElementById("airtimeNetworkLogo").textContent },
      { label: "Phone Number", value: document.getElementById("airtimePhone").value || "—" },
      { label: "Reference", value: generateRef() },
    ],
  }));
  wireDemoForm("bettingForm", "bettingSubmitBtn", "✅ Betting wallet funded.", 1, (form) => ({
    title: "Betting Wallet Funded",
    amount: `$${Number(document.getElementById("bettingCustomAmount").value || 0).toLocaleString()}`,
    details: [
      { label: "Platform", value: form.querySelector(".dp-provider-item.active")?.dataset.provider || "—" },
      { label: "User ID", value: document.getElementById("bettingUserId").value || "—" },
      { label: "Reference", value: generateRef() },
    ],
  }));
  wireDemoForm("electricityForm", "electricitySubmitBtn", "✅ Electricity payment successful.", 1, () => ({
    title: "Electricity Payment Successful",
    amount: `$${Number(document.getElementById("electricityCustomAmount").value || 0).toLocaleString()}`,
    details: [
      { label: "Provider", value: document.getElementById("electricityProviderName").textContent },
      { label: "Meter Number", value: document.getElementById("electricityMeter").value || "—" },
      { label: "Reference", value: generateRef() },
    ],
  }));
  wireDemoForm("transferBankForm", "transferBankNextBtn", "✅ Transfer submitted — funds are on their way.", 0.85, () => ({
    title: "Transfer Submitted",
    message: "Funds are on their way — this can take a few minutes.",
    details: [
      { label: "Bank", value: document.getElementById("transferBankSelect").value || "—" },
      { label: "Account Number", value: document.getElementById("transferBankAccount").value || "—" },
      { label: "Reference", value: generateRef() },
    ],
  }));
  wireDemoForm("transferWalletForm", "transferWalletNextBtn", "✅ Transfer submitted — funds are on their way.", 0.9, () => ({
    title: "Transfer Submitted",
    message: "Funds are on their way — this can take a few minutes.",
    details: [
      { label: "Recipient", value: document.getElementById("transferWalletRecipient").value || "—" },
      { label: "Reference", value: generateRef() },
    ],
  }));

  // TV "Pay" button isn't inside a <form> (there's no single amount field —
  // the amount comes from whichever plan card the person picks), so it
  // gets its own lightweight handler instead of wireDemoForm().
  const tvBtn = document.getElementById("tvSubmitBtn");
  tvBtn?.addEventListener("click", async () => {
    const success = await withButtonLoading(tvBtn, { loadingText: "Processing…" });
    if (success) {
      bootstrap.Modal.getOrCreateInstance(tvBtn.closest(".modal")).hide();
      showSuccessPage({
        title: "TV Subscription Renewed",
        details: [
          { label: "Provider", value: document.querySelector("#tvModal .dp-provider-item.active")?.dataset.provider || "—" },
          { label: "Reference", value: generateRef() },
        ],
      });
    }
  });

  // Loan "Get Funds"
  const loanBtn = document.getElementById("loanGetFundsBtn");
  loanBtn?.addEventListener("click", async () => {
    const success = await withButtonLoading(loanBtn, { loadingText: "Processing…" });
    if (success) {
      bootstrap.Modal.getOrCreateInstance(loanBtn.closest(".modal")).hide();
      showSuccessPage({
        title: "Funds Disbursed",
        message: "Sent to your DubemPay balance.",
        amount: document.querySelector("#loanModal .dp-loan-limit-figure")?.textContent || "",
        details: [{ label: "Reference", value: generateRef() }],
      });
    }
  });

  // Fixed savings "Save" buttons — several on one screen, so a delegated toast is enough
  document.querySelectorAll(".dp-fixed-save-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(`✅ ${btn.dataset.label} started.`);
      playChime(920);
      fireCta(btn);
    });
  });

  // Any other [data-label] control inside these modals that doesn't already
  // have its own handler above (Loan Q&A/Repayment, "More" service tiles,
  // etc.) — same shared "demo only" toast as Quick Services. The Withdraw
  // modal's rows are NOT included here: they're .dp-help-item buttons and
  // already get this exact toast from initHelpCenter(), so adding them
  // again here would just fire the toast twice per click.
  document
    .querySelectorAll("#loanModal [data-label]:not(.dp-fixed-save-btn), #allServiceModal [data-label], #electricityModal [data-label]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        showToast(`🔧 ${btn.dataset.label} — connect this to a real flow when you have one.`);
        playChime(700);
      });
    });
}


/* -----------------------------------------------------------------
   10a. CUSTOMER CARE — wires up the Help Center modal buttons
----------------------------------------------------------------- */
/* -----------------------------------------------------------------
   10a3. SETTINGS MODAL
   Expand-in-place rows for anything genuinely interactive (Security
   Questions, SMS Alerts, Clipboard, Feedback, Close Account, About);
   Payment/Login/Savings/Homepage Settings fall through to the same
   generic "not wired up" toast every other stub button in this app
   uses (handled by initHelpCenter, since these are plain .dp-help-item
   buttons with a data-label and no special id).
----------------------------------------------------------------- */
function initSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  // Generic expand/collapse: each "id + Toggle" button reveals the
  // sibling "id + Form/Body" block. Several can be open at once — these
  // are independent settings, not an either/or accordion like the FAQ.
  document.querySelectorAll(".dp-settings-expand-item").forEach((item) => {
    const trigger = item.querySelector(".dp-help-item");
    const body = item.querySelector(".dp-settings-expand-body");
    trigger?.addEventListener("click", () => {
      body.classList.toggle("d-none");
      const chevron = trigger.querySelector(".dp-help-item-chevron");
      chevron?.classList.toggle("bi-chevron-right");
      chevron?.classList.toggle("bi-chevron-down");
    });
  });

  // --- Security Questions ---
  const secStatus = document.getElementById("securityQuestionsStatus");
  function renderSecurityQuestionsStatus() {
    const isSet = appState.securityQuestionsSet;
    secStatus.textContent = isSet ? "Set" : "Not Set";
    secStatus.classList.toggle("is-set", isSet);
  }
  renderSecurityQuestionsStatus();

  document.getElementById("securityQuestionsSaveBtn")?.addEventListener("click", () => {
    const q1 = document.getElementById("secQ1").value.trim();
    const q2 = document.getElementById("secQ2").value.trim();
    const q3 = document.getElementById("secQ3").value.trim();
    if (!q1 || !q2 || !q3) {
      showToast("Please answer all three questions.", "error");
      return;
    }
    // 🔧 EDIT HERE: answers themselves aren't persisted (this is a demo,
    // not a place to store real security-question answers) — only the
    // fact that they've been set, so the status pill reflects reality.
    appState.securityQuestionsSet = true;
    persistState();
    renderSecurityQuestionsStatus();
    showToast("✅ Security questions saved.");
    playChime(920);
  });

  // --- SMS Alerts + Clipboard toggles ---
  const toggleMap = {
    smsDebitToggle: "smsDebit",
    smsCreditToggle: "smsCredit",
    smsLoginToggle: "smsLogin",
    clipboardAccessToggle: "clipboardAccess",
  };
  Object.entries(toggleMap).forEach(([elId, stateKey]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.checked = !!appState.settings[stateKey];
    el.addEventListener("change", () => {
      appState.settings[stateKey] = el.checked;
      persistState();
      playChime(el.checked ? 920 : 700);
    });
  });

  // --- Themes: delegates to the same toggle the topbar sun/moon icon uses ---
  document.getElementById("settingsThemesBtn")?.addEventListener("click", () => {
    document.getElementById("themeToggleBtn")?.click();
  });

  // --- Feedback ---
  document.getElementById("feedbackSubmitBtn")?.addEventListener("click", async () => {
    const textarea = document.getElementById("feedbackText");
    if (!textarea.value.trim()) {
      showToast("Write something first — even a sentence helps.", "error");
      return;
    }
    const btn = document.getElementById("feedbackSubmitBtn");
    // 🔧 EDIT HERE: this doesn't go anywhere yet — wire it to a real
    // feedback endpoint/inbox when you have one.
    await withButtonLoading(btn, { loadingText: "Sending…" });
    showToast("✅ Thanks — your feedback has been sent.");
    playChime(920);
    textarea.value = "";
  });

  // --- Close Account: real, destructive — clears this account's saved
  // state and logs out. Gated behind the expand-in-place confirmation
  // panel so it's never a single accidental click. ---
  document.getElementById("closeAccountConfirmBtn")?.addEventListener("click", () => {
    if (!currentUser) return;
    const email = currentUser.email;
    localStorage.removeItem(getStateKey(email));
    const accounts = getAccounts();
    delete accounts[email];
    saveAccounts(accounts);
    clearSession();
    showToast("Your account has been closed.");
    window.location.reload();
  });

  // --- Payment Settings: default funding source (single-select radio rows) ---
  const fundingRows = document.querySelectorAll(".dp-settings-radio-row");
  function renderFundingSource() {
    fundingRows.forEach((row) => {
      row.classList.toggle("active", row.dataset.fundingValue === appState.settings.defaultFundingSource);
    });
  }
  renderFundingSource();
  fundingRows.forEach((row) => {
    row.addEventListener("click", () => {
      appState.settings.defaultFundingSource = row.dataset.fundingValue;
      persistState();
      renderFundingSource();
      showToast(`✅ Default funding source set to ${row.textContent.trim()}.`);
      playChime(920);
    });
  });

  // --- Login Settings: a real change-password form, checked against this
  // account's actual stored credential (see hashPassword in core.js). ---
  document.getElementById("loginPasswordSaveBtn")?.addEventListener("click", async () => {
    const currentInput = document.getElementById("loginCurrentPassword");
    const newInput = document.getElementById("loginNewPassword");
    const confirmInput = document.getElementById("loginConfirmPassword");
    if (!currentUser) return;

    const accounts = getAccounts();
    const account = accounts[currentUser.email];
    const currentHash = await hashPassword(currentInput.value);

    if (!account || currentHash !== account.passwordHash) {
      showToast("Current password is incorrect.", "error");
      currentInput.classList.add("is-invalid");
      return;
    }
    currentInput.classList.remove("is-invalid");

    if (newInput.value.length < 8) {
      showToast("New password needs to be at least 8 characters.", "error");
      newInput.classList.add("is-invalid");
      return;
    }
    newInput.classList.remove("is-invalid");

    if (newInput.value !== confirmInput.value) {
      showToast("New password and confirmation don't match.", "error");
      confirmInput.classList.add("is-invalid");
      return;
    }
    confirmInput.classList.remove("is-invalid");

    const btn = document.getElementById("loginPasswordSaveBtn");
    await withButtonLoading(btn, { loadingText: "Updating…" });
    account.passwordHash = await hashPassword(newInput.value);
    saveAccounts(accounts);
    showToast("✅ Password updated.");
    playChime(920);
    [currentInput, newInput, confirmInput].forEach((el) => (el.value = ""));
  });

  // --- Savings Settings: default frequency + round-up, persisted ---
  const savingsFreqTabs = document.querySelectorAll("[data-savings-frequency]");
  function renderSavingsFrequency() {
    savingsFreqTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.savingsFrequency === appState.settings.defaultSavingsFrequency);
    });
  }
  renderSavingsFrequency();
  savingsFreqTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      appState.settings.defaultSavingsFrequency = tab.dataset.savingsFrequency;
      persistState();
      renderSavingsFrequency();
      playChime(920);
    });
  });
  const roundUpToggle = document.getElementById("savingsRoundUpToggle");
  if (roundUpToggle) {
    roundUpToggle.checked = !!appState.settings.roundUp;
    roundUpToggle.addEventListener("change", () => {
      appState.settings.roundUp = roundUpToggle.checked;
      persistState();
      playChime(roundUpToggle.checked ? 920 : 700);
    });
  }

  // --- Homepage Settings: real toggles for optional Home widgets, applied
  // live to the actual sections (not just remembered for later) — and
  // opening this panel clears its notification dot for good. ---
  const homepageToggleMap = {
    homeShowSplitterToggle: { key: "homeShowSplitter", sectionId: "currencySplitterSection" },
    homeShowRoutingToggle: { key: "homeShowRouting", sectionId: "routingSection" },
    homeShowHeatmapToggle: { key: "homeShowHeatmap", sectionId: "heatmapSection" },
  };
  function applyHomepageVisibility() {
    Object.values(homepageToggleMap).forEach(({ key, sectionId }) => {
      document.getElementById(sectionId)?.classList.toggle("d-none", !appState.settings[key]);
    });
  }
  Object.entries(homepageToggleMap).forEach(([elId, { key }]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.checked = appState.settings[key] !== false;
    el.addEventListener("change", () => {
      appState.settings[key] = el.checked;
      persistState();
      applyHomepageVisibility();
      playChime(el.checked ? 920 : 700);
    });
  });
  applyHomepageVisibility();

  document.getElementById("homepageSettingsToggle")?.addEventListener("click", () => {
    if (!appState.settings.homepageSettingsSeen) {
      appState.settings.homepageSettingsSeen = true;
      persistState();
      document.getElementById("homepageSettingsDot")?.classList.add("d-none");
    }
  });
  if (appState.settings.homepageSettingsSeen) {
    document.getElementById("homepageSettingsDot")?.classList.add("d-none");
  }
}


function initHelpCenter() {
  document.querySelectorAll(".dp-help-item").forEach((btn) => {
    // Skip rows that already open a real modal (e.g. the Transfer Success
    // Rate Monitor row borrows this class purely for its styling), real
    // <a href="tel:"/"mailto:"> links (Call/Email Support — those navigate
    // on their own), Settings rows that expand in place instead of
    // toasting (initSettingsModal already owns their click behavior), and
    // any row built around a live toggle switch (its own "change" handler
    // is the real behavior — a click bubbling up to also fire a toast
    // would just be noise on top of it).
    if (
      btn.hasAttribute("data-bs-toggle") ||
      btn.tagName === "A" ||
      btn.closest(".dp-settings-expand-item") ||
      btn.querySelector(".form-check-input")
    ) {
      return;
    }
    btn.addEventListener("click", () => {
      // 🔧 EDIT HERE: once a live-chat widget exists, replace this toast with the real action.
      showToast(`🔧 ${btn.dataset.label} — connect this to a real support channel.`);
      playChime(700);
    });
  });
}


/* -----------------------------------------------------------------
   10a2. HELP CENTER / FAQ ACCORDION
   Expand-in-place accordion (no page navigation) with a live search
   that filters questions by their visible text and hides any topic
   group left with zero matches. 🔧 EDIT HERE: this is real, working
   client-side search — swap the questions/answers in index.html for
   your actual policies whenever you're ready.
----------------------------------------------------------------- */
function initFaqAccordion() {
  const items = document.querySelectorAll(".dp-faq-item");
  const searchInput = document.getElementById("faqSearchInput");
  const noResults = document.getElementById("faqNoResults");
  if (!items.length) return;

  items.forEach((item) => {
    const question = item.querySelector(".dp-faq-question");
    question.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      // Accordion behavior: opening one closes any other that's open,
      // so the list doesn't grow into one long scroll of answers.
      items.forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let anyVisible = false;

    items.forEach((item) => {
      const text = item.textContent.toLowerCase();
      const matches = !query || text.includes(query);
      item.style.display = matches ? "" : "none";
      if (matches) anyVisible = true;
    });

    // Hide a group's own label (e.g. "Account & Security") once every
    // question under it is filtered out, so search results don't show
    // an orphaned header with nothing underneath it.
    document.querySelectorAll('[data-faq-group].dp-mini-label').forEach((label) => {
      const group = label.dataset.faqGroup;
      const groupHasVisible = Array.from(
        document.querySelectorAll(`.dp-faq-item[data-faq-group="${group}"]`)
      ).some((i) => i.style.display !== "none");
      label.style.display = groupHasVisible ? "" : "none";
    });

    if (noResults) noResults.style.display = anyVisible ? "none" : "";
  });

  // Fresh state every time the modal opens: closed accordion, empty search.
  document.getElementById("faqModal")?.addEventListener("hidden.bs.modal", () => {
    items.forEach((i) => i.classList.remove("open"));
    if (searchInput) searchInput.value = "";
    items.forEach((i) => (i.style.display = ""));
    document.querySelectorAll('[data-faq-group].dp-mini-label').forEach((l) => (l.style.display = ""));
    if (noResults) noResults.style.display = "none";
  });
}


/* -----------------------------------------------------------------
   9a. USSD SERVICE
   Dial-code reference list for banking without data/internet — see
   the modal markup comment in index.html for why "call" copies
   instead of dialing.
----------------------------------------------------------------- */
const USSD_QUICK_PAYMENTS = [
  { icon: "bi-bank2", title: "Transfer to Bank Account", code: "*312*2*amount*10 digit account no.#" },
  { icon: "bi-send-fill", title: "Transfer to DubemPay Account", code: "*312*1*amount*10 digit account no.#" },
  { icon: "bi-phone-fill", title: "Airtime for Self", code: "*312*3*amount#" },
  { icon: "bi-phone-fill", title: "Airtime for Others", code: "*312*3*amount*mobile no.#" },
  { icon: "bi-wifi", title: "Data", code: "*312*4*mobile no.#" },
  { icon: "bi-dice-5-fill", title: "Betting", code: "*312*5#" },
  { icon: "bi-lightning-charge-fill", title: "Electricity", code: "*312*6#" },
];

const USSD_ACCOUNT_MANAGEMENT = [
  { icon: "bi-chat-square-text-fill", title: "Activate SMS Alert", code: "*312*9#" },
  { icon: "bi-shield-check", title: "Get OTP", code: "*312*010#" },
  { icon: "bi-lock-fill", title: "Restrict/Unrestrict Account", code: "*312*131#" },
  { icon: "bi-credit-card-2-front-fill", title: "Block/Unblock Card", code: "*312*132#" },
  { icon: "bi-patch-check-fill", title: "Card Activation", code: "*312*03121#" },
  { icon: "bi-wallet2", title: "Check Total Assets", code: "*312*0#" },
];

function initUssdModal() {
  const quickList = document.getElementById("ussdQuickPaymentsList");
  const acctList = document.getElementById("ussdAccountList");
  const toggle = document.getElementById("ussdEnabledToggle");
  if (!quickList || !acctList) return;

  function rowHtml(item) {
    return `
      <div class="dp-ussd-row">
        <span class="dp-help-item-icon"><i class="bi ${item.icon}"></i></span>
        <span class="dp-ussd-row-info">
          <span class="dp-help-item-title d-block">${item.title}</span>
          <span class="dp-help-item-sub">${item.code}</span>
        </span>
        <button type="button" class="dp-ussd-call-btn" data-ussd-code="${item.code}" aria-label="Copy ${item.title} USSD code">
          <i class="bi bi-telephone-fill"></i>
        </button>
      </div>
    `;
  }

  quickList.innerHTML = USSD_QUICK_PAYMENTS.map(rowHtml).join("");
  acctList.innerHTML = USSD_ACCOUNT_MANAGEMENT.map(rowHtml).join("");

  // A web page can't actually place a phone call to dial a USSD code —
  // copying it to the clipboard so the person can paste it into their
  // phone's dialer is the closest genuinely useful thing this can do.
  document.querySelectorAll(".dp-ussd-call-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.ussdCode;
      try {
        await navigator.clipboard.writeText(code);
        showToast(`📋 Copied "${code}" — paste it into your phone's dialer to continue.`);
      } catch {
        showToast(`Dial "${code}" on your phone to continue.`);
      }
      playChime(760);
    });
  });

  function applyUssdEnabled(enabled) {
    [quickList, acctList].forEach((list) => {
      list.classList.toggle("dp-ussd-disabled", !enabled);
      list.querySelectorAll(".dp-ussd-call-btn").forEach((btn) => (btn.disabled = !enabled));
    });
  }

  if (toggle) {
    toggle.checked = appState.settings.ussdEnabled !== false;
    applyUssdEnabled(toggle.checked);
    toggle.addEventListener("change", () => {
      appState.settings.ussdEnabled = toggle.checked;
      persistState();
      applyUssdEnabled(toggle.checked);
      playChime(toggle.checked ? 920 : 700);
    });
  }
}


/* -----------------------------------------------------------------
   10a. SIDEBAR (mobile off-canvas toggle)
----------------------------------------------------------------- */
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const toggleBtn = document.getElementById("sidebarToggleBtn");

  function openSidebar() {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-visible");
  }
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
  }

  // The mobile hamburger trigger was removed — Home/Rewards/Finance/Cards/Me
  // (the bottom nav) plus the Me page's own Security/Support/etc. rows
  // already cover everything the off-canvas sidebar used to be needed for
  // below the lg breakpoint. Guarded here so desktop (where the sidebar is
  // permanently visible, not off-canvas, and never had a toggle button
  // anyway) keeps working exactly as before.
  toggleBtn?.addEventListener("click", openSidebar);
  backdrop.addEventListener("click", closeSidebar);

  // Tapping a nav link on mobile should close the panel behind it,
  // same as any real app's off-canvas menu.
  sidebar.querySelectorAll(".dp-sidebar-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Esc closes it too, for keyboard users
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  // Active-state highlighting for these links, and the actual page-switching
  // they trigger, both live in initPageRouter() now — the app moved from a
  // single long scrolling page to real show/hide "pages" per section, so
  // scrollspy (which assumed everything was scrollable in one document) no
  // longer applies. See initPageRouter() below.
}


/* -----------------------------------------------------------------
   10b. REWARDS + SAVINGS & WEALTH
----------------------------------------------------------------- */
function initRewardsAndSavings() {
  // --- Voucher tabs (Hot / Shopping / Dining) ---
  const tabs = document.querySelectorAll(".dp-voucher-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.voucherTab;
      document.querySelectorAll("[data-voucher-panel]").forEach((panel) => {
        panel.classList.toggle("d-none", panel.dataset.voucherPanel !== target);
      });
    });
  });

  // --- Voucher "Use" buttons ---
  document.querySelectorAll(".dp-voucher-use").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(`✅ ${btn.dataset.label} applied — connect this to a real redemption flow.`);
      playChime(920);
      fireCta(btn);
    });
  });

  // --- Daily Bonus "Go" buttons ---
  document.querySelectorAll(".dp-bonus-go").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(`🔧 ${btn.dataset.label} — connect this to a real flow when you have one.`);
      playChime(700);
    });
  });

  // --- Exclusive reward "Sign Up Now" ---
  const signUpBtn = document.getElementById("signUpRewardBtn");
  signUpBtn.addEventListener("click", () => {
    const statusEl = document.querySelector(".dp-exclusive-status");
    statusEl.textContent = "Signed up ✓";
    signUpBtn.disabled = true;
    signUpBtn.innerHTML = 'Signed up <i class="bi bi-check-lg"></i>';
    playChime(950);
    fireCta(signUpBtn);
  });

  // --- Affiliate "Apply Now" button ---
  document.querySelectorAll(".dp-affiliate-banner [data-label]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(`🔧 ${btn.dataset.label} — connect this to a real flow when you have one.`);
      playChime(700);
      fireCta(btn);
    });
  });
}


/* -----------------------------------------------------------------
   10c. HOT DEALS — timed flash-discount countdown + Remind button
----------------------------------------------------------------- */
function initHotDeal() {
  const statusEl = document.getElementById("hotDealStatus");
  const countdownEl = document.getElementById("hotDealCountdown");
  const remindBtn = document.getElementById("hotDealRemindBtn");
  if (!countdownEl) return;

  // Demo hot-deal window: runs until 19:30 today, same shape as the
  // 08:30/19:30 flash-sale window in the reference screenshots.
  function getDealEnd() {
    const end = new Date();
    end.setHours(19, 30, 0, 0);
    return end;
  }

  function tick() {
    const msLeft = getDealEnd().getTime() - Date.now();
    if (msLeft <= 0) {
      countdownEl.textContent = "";
      statusEl.innerHTML = "Event already ended";
      remindBtn.disabled = true;
      return;
    }
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    const s = Math.floor((msLeft % 60000) / 1000);
    countdownEl.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  tick();
  setInterval(tick, 1000);

  remindBtn.addEventListener("click", () => {
    showToast("✅ We'll remind you before this deal ends.");
    fireCta(remindBtn);
    playChime(920);
  });
}


/* -----------------------------------------------------------------
   10d. ME / PROFILE — profile card + security/quick-access grid
----------------------------------------------------------------- */
function initMeSection() {
  // Greeting + avatar mirror whatever the topbar already shows, so the
  // Me section never goes stale relative to the signed-in account.
  const meGreeting = document.getElementById("meGreetingText");
  const navGreeting = document.getElementById("profileGreetingText");
  if (meGreeting && navGreeting) {
    meGreeting.textContent = navGreeting.textContent.replace(" 👋", "");
  }
  const meAvatar = document.getElementById("meAvatar");
  const navAvatar = document.getElementById("navAvatar");
  if (meAvatar && navAvatar) {
    meAvatar.textContent = navAvatar.textContent;
  }

  // Add Email nudge — same "not wired up in this demo" honesty as forgot-password
  const addEmailBtn = document.getElementById("meAddEmailBtn");
  addEmailBtn?.addEventListener("click", () => {
    showToast("🔧 Add Email — connect this to a real verification flow when you have one.");
    playChime(700);
  });

  // USSD Service now opens the real #ussdModal (data-bs-toggle on the
  // button itself, see initUssdModal() for what's inside it). Business
  // Hub does the same for #bizPaymentModal, so neither needs a handler
  // here anymore.

  // Dark Mode row just delegates to the existing theme toggle button in the topbar,
  // so there's only ONE source of truth for the current theme.
  document.getElementById("meDarkModeBtn")?.addEventListener("click", () => {
    document.getElementById("themeToggleBtn")?.click();
  });
}


/* -----------------------------------------------------------------
   10e. BOTTOM NAV — 5-item mobile tab bar active-state highlighting
   (the links themselves are plain #anchor jumps; this only keeps the
   highlighted tab in sync with which section is on screen, the same
   scrollspy approach initSidebar() already uses for the sidebar.)
----------------------------------------------------------------- */
function initBottomNav() {
  // Active-state highlighting and the actual page switch both live in
  // initPageRouter() now, since these links target real "pages" (shown/
  // hidden divs) rather than scroll positions on one long document —
  // nothing extra to wire up here beyond what the router already does.
}


/* -----------------------------------------------------------------
   10e2. PAGE ROUTER — swaps between full "pages" (Home / Transactions /
   Cards / Rewards / Finance / Me) instead of scrolling one long document.
   Every sidebar link and bottom-nav tab still uses a normal href="#id"
   anchor (good for accessibility + right-click-to-open-in-new-tab), but
   clicks are intercepted here so the browser never actually jumps —
   the target page is shown instead, matching how the OPay/PalmPay app
   this project is modeled on switches whole screens rather than
   scrolling. The "Transaction History" link and the Transactions page's
   "Back" button use a lighter [data-page-link] attribute instead, since
   they don't correspond to a specific heading id.
----------------------------------------------------------------- */
function initPageRouter() {
  // Where each in-page anchor id actually lives. Several ids share a
  // page — e.g. Invoicing and Subscriptions were folded into the
  // Finance page, so both resolve to "finance" and then get an extra
  // in-page scroll (see PAGE_TOP_ID below) to reach the right spot.
  const PAGE_MAP = {
    topAnchor: "home",
    txHeading: "transactions",
    cardHeading: "cards",
    rewardsHeading: "rewards",
    financeHeading: "finance",
    invoiceHeading: "finance",
    subsHeading: "finance",
    meHeading: "me",
  };
  // The id that IS a given page's own top heading — if the clicked link's
  // id matches this, no further in-page scroll is needed after the page
  // switch; otherwise we scroll down to the specific id within the page.
  const PAGE_TOP_ID = {
    home: "topAnchor",
    transactions: "txHeading",
    cards: "cardHeading",
    rewards: "rewardsHeading",
    finance: "financeHeading",
    me: "meHeading",
  };

  const pages = document.querySelectorAll(".dp-page");
  const bottomLinks = document.querySelectorAll(".dp-bottom-nav-link");
  const sidebarSectionLinks = Array.from(document.querySelectorAll(".dp-sidebar-link")).filter(
    (link) => link.getAttribute("href")?.startsWith("#") && !link.hasAttribute("data-bs-toggle")
  );
  const mainEl = document.querySelector(".dp-shell-main");

  function setActiveLinks(pageName, clickedSidebarLink) {
    // Bottom nav: the Transactions page has no tab of its own (it's
    // reached FROM Home), so keep the Home tab lit while on it.
    const bottomKey = pageName === "transactions" ? "home" : pageName;
    bottomLinks.forEach((l) => l.classList.toggle("active", l.dataset.bottomNav === bottomKey));

    // Sidebar: highlight whichever link was actually clicked when we know
    // it (keeps "Invoicing" and "Finance" distinguishable even though both
    // land on the same page); otherwise fall back to the first sidebar
    // link whose target resolves to this page.
    sidebarSectionLinks.forEach((l) => l.classList.remove("active"));
    const fallback = sidebarSectionLinks.find((l) => PAGE_MAP[l.getAttribute("href").slice(1)] === pageName);
    (clickedSidebarLink || fallback)?.classList.add("active");
  }

  function showPage(pageName, clickedSidebarLink) {
    pages.forEach((p) => p.classList.toggle("dp-page-active", p.dataset.page === pageName));
    setActiveLinks(pageName, clickedSidebarLink);
    // Every page switch starts at the top, like opening a fresh screen —
    // scrolling happens afterward only if navigateTo() needs to land on a
    // specific sub-heading within the page (e.g. Subscriptions, further
    // down the Finance page).
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function navigateTo(id, clickedSidebarLink) {
    const pageName = PAGE_MAP[id] || "home";
    showPage(pageName, clickedSidebarLink);
    if (id !== PAGE_TOP_ID[pageName]) {
      // Let the page finish becoming visible before measuring where to scroll.
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  // Every real href="#id" anchor that targets a page/section — sidebar
  // links, bottom-nav tabs, the brand logo, "View all", the skip link,
  // and the All-Services modal's "Physical Card" tile all go through
  // this one path. Bare "#" placeholders and modal triggers are left
  // alone (they don't have a matching PAGE_MAP entry).
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (!id || !(id in PAGE_MAP)) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(id, sidebarSectionLinks.includes(link) ? link : null);
    });
  });

  // Buttons that switch pages without a specific heading id to jump to:
  // the "Transaction History" link on the balance card and the
  // Transactions page's own "← Back" button.
  document.querySelectorAll("[data-page-link]").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.pageLink));
  });
}


