/* =================================================================
   DUBEMPAY — dashboard.js
   =================================================================
   Loaded second. Everything to do with money on the main dashboard:
   theme, the balance card + currency splitter, the live top-5-currency
   converter, the balance trend sparkline, the AI routing tracker demo,
   the holographic card controls, one-click invoicing, and the Add
   Money / Send buttons. Depends on helpers defined in core.js
   (formatMoney, playChime, fireCta, showToast, escapeHTML, appState).
   ================================================================= */


/* -----------------------------------------------------------------
   2. THEME SWITCHER (dark / light)
----------------------------------------------------------------- */
function initThemeSwitcher() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const track = toggleBtn.querySelector(".dp-theme-track");
  const htmlEl = document.documentElement; // the <html> tag

  // Prefer the signed-in account's saved theme; fall back to whatever's
  // already on <html> (set before login), then "dark" as the last resort.
  // 🔧 EDIT HERE: change "dark" below if you want the site to default to light mode instead.
  let currentTheme = appState.theme || htmlEl.getAttribute("data-theme") || "dark";

  function applyTheme(theme) {
    htmlEl.setAttribute("data-theme", theme);       // this is what styles.css reads
    track.classList.toggle("is-light", theme === "light"); // slides the little toggle thumb
    currentTheme = theme;
  }

  toggleBtn.addEventListener("click", () => {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
    appState.theme = currentTheme;
    persistState(); // remembered for this account's next login
    playChime(660); // slightly lower tone for theme toggle, per the brief's "biometric sound" idea
  });

  applyTheme(currentTheme); // set the correct initial toggle position on page load
}


/* -----------------------------------------------------------------
   3. BALANCE VISIBILITY + CURRENCY SPLITTER
----------------------------------------------------------------- */

/**
 * renderBalance
 * Writes appState.balance into every place the balance figure appears
 * (the main dashboard card and the Finance page's own copy). Called once
 * on login and again anytime appState.balance changes (Add Money, Send,
 * or any other flow that should move the number) — appState stays the
 * single source of truth, these elements just reflect it.
 */
function renderBalance() {
  const balanceEl = document.getElementById("mainBalance");
  const financeBalanceEl = document.getElementById("financeBalanceFigure");
  const formatted = formatMoney(appState.balance || 0, "$");
  if (balanceEl) balanceEl.textContent = formatted;
  if (financeBalanceEl) financeBalanceEl.textContent = formatted;
}

function initBalanceControls() {
  const balanceEl = document.getElementById("mainBalance");
  const eyeBtn = document.getElementById("toggleBalanceVisibility");
  const eyeIcon = eyeBtn.querySelector("i");

  renderBalance();

  // Click the eye icon to blur/unblur the big balance number (privacy feature many banking apps have).
  eyeBtn.addEventListener("click", () => {
    const isHidden = balanceEl.classList.toggle("dp-hidden-balance");
    eyeIcon.className = isHidden ? "bi bi-eye-slash-fill" : "bi bi-eye-fill";
    eyeBtn.setAttribute("aria-label", isHidden ? "Show balance" : "Hide balance");
  });

  // Same hide/show pattern for the Finance section's own balance readout —
  // a separate control since it lives in a different card further down the page.
  const financeBalanceEl = document.getElementById("financeBalanceFigure");
  const financeEyeBtn = document.getElementById("toggleFinanceBalanceVisibility");
  if (financeBalanceEl && financeEyeBtn) {
    const financeEyeIcon = financeEyeBtn.querySelector("i");
    financeEyeBtn.addEventListener("click", () => {
      const isHidden = financeBalanceEl.classList.toggle("dp-hidden-balance");
      financeEyeIcon.className = isHidden ? "bi bi-eye-slash-fill" : "bi bi-eye-fill";
      financeEyeBtn.setAttribute("aria-label", isHidden ? "Show balance" : "Hide balance");
    });
  }

  // --- Smart Currency Splitter slider ---
  const slider = document.getElementById("currencySplitter");
  const readout = document.getElementById("splitterReadout");

  // 🔧 EDIT HERE: this is the pot of USD being split between USD and EUR.
  // Swap in a real account balance if you connect this to a backend later.
  const TOTAL_TO_SPLIT = 5000;

  slider.addEventListener("input", () => {
    const usdPercent = Number(slider.value);      // 0–100, how much stays in USD
    const eurPercent = 100 - usdPercent;           // the rest converts to EUR

    const usdShare = (TOTAL_TO_SPLIT * usdPercent) / 100;
    const eurShareInUsd = (TOTAL_TO_SPLIT * eurPercent) / 100;
    // Uses the same live EUR rate as the currency chips below, so this
    // slider and the top-5 breakdown never show two different EUR rates.
    const eurShare = eurShareInUsd * (liveRates.EUR ?? 0.92);

    readout.textContent =
      `${usdPercent}% USD (${formatMoney(usdShare, "$")}) / ` +
      `${eurPercent}% EUR (${formatCurrencyAmount(eurShare, "EUR")})`;
  });
}


/* -----------------------------------------------------------------
   3a. LIVE CURRENCY CONVERTER — top 5 world currencies + NGN
   =====================================================================
   "Top 5" here means the 5 most-traded currencies globally, per the
   Bank for International Settlements' triennial FX survey: USD, EUR,
   JPY, GBP, then CNY (that ranking is by trading volume — a "top 5 by
   reserve holdings" list would look slightly different, e.g. swapping
   in CHF). 🔧 EDIT HERE if you'd rather track a different set. We also
   track NGN (Nigerian Naira) alongside those 5, since it matters most
   to DubemPay's actual users.

   Rates come from ExchangeRate-API's free open endpoint
   (https://www.exchangerate-api.com/docs/free) — no API key needed.
   We use this instead of an ECB-only service (like Frankfurter) on
   purpose: the ECB doesn't publish an NGN reference rate at all, so an
   ECB-based feed simply can't price the Naira. ExchangeRate-API pulls
   from a wider set of market sources that does include it.
----------------------------------------------------------------- */

// 🔧 EDIT HERE: swap for your real balance if you connect this to a backend.
const BASE_BALANCE_USD = 12450.0;

// Currency symbols + decimal conventions (JPY/NGN conventionally shown
// without cents at everyday amounts; the rest use 2 decimal places).
const CURRENCY_FORMAT = {
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  CNY: { symbol: "¥", decimals: 2 },
  NGN: { symbol: "₦", decimals: 0 },
};

// liveRates.USD is always 1 (the base currency); everything else gets
// filled in by fetchLiveRates(). Declared at the top level (not inside a
// function) so it's ready before any other module reads it. Every chip
// (and the currency splitter) reads from this SAME object, so they can
// never show numbers converted at different rates from each other.
let liveRates = { USD: 1 };

/**
 * formatCurrencyAmount
 * Formats a number using the right symbol and decimal convention for a
 * given currency code (see CURRENCY_FORMAT above).
 */
function formatCurrencyAmount(value, code) {
  const format = CURRENCY_FORMAT[code] || { symbol: "", decimals: 2 };
  return (
    format.symbol +
    value.toLocaleString("en-US", {
      minimumFractionDigits: format.decimals,
      maximumFractionDigits: format.decimals,
    })
  );
}

/**
 * renderCurrencyChips
 * Converts appState.balance into every tracked currency using whatever's
 * currently in liveRates, and writes the result into each chip. Because
 * every chip is computed from the same appState.balance × the same
 * liveRates object, they always stay mutually consistent — e.g. the EUR
 * figure and the NGN figure are always two views of the exact same
 * underlying USD amount, never independently-drifting numbers.
 */
function renderCurrencyChips() {
  Object.keys(CURRENCY_FORMAT).forEach((code) => {
    const el = document.getElementById(`${code.toLowerCase()}Amt`);
    if (!el) return;
    const rate = liveRates[code] ?? 1;
    el.textContent = formatCurrencyAmount((appState.balance || 0) * rate, code);
  });
}

/**
 * fetchLiveRates
 * Calls the real ExchangeRate-API for live USD → EUR/GBP/JPY/CNY/NGN
 * rates, all in one request. If it fails (no internet, the service is
 * down, a network policy blocks it, etc.) we fall back to reasonable
 * fixed rates so the UI still works — clearly labeled as offline/
 * approximate rather than silently pretending they're live.
 */
async function fetchLiveRates() {
  const caption = document.getElementById("ratesCaption");
  const refreshBtn = document.getElementById("refreshRatesBtn");
  refreshBtn.classList.add("dp-rates-spinning");
  caption.textContent = "Fetching…";

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) throw new Error(`Rate service responded ${response.status}`);
    const data = await response.json();
    if (data.result !== "success") throw new Error("Rate service returned an error result");

    liveRates = {
      USD: 1,
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      JPY: data.rates.JPY,
      CNY: data.rates.CNY,
      NGN: data.rates.NGN,
    };
    // Keep the visible text short (so it never overflows on a narrow phone) —
    // the full detail is still available as a hover tooltip on desktop.
    caption.textContent = "Live rates ✓";
    caption.title = `As of ${data.time_last_update_utc} · via ExchangeRate-API`;
    caption.classList.remove("dp-rates-offline");
  } catch (err) {
    // 🔧 EDIT HERE: these fallback numbers WILL drift out of date over time —
    // they only exist so the UI still functions without a live connection.
    // The fetch above is what keeps this genuinely accurate; don't rely on
    // these for anything real.
    liveRates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.25, NGN: 1530 };
    caption.textContent = "Offline rates";
    caption.title = "Showing approximate offline rates — tap ↻ to retry.";
    caption.classList.add("dp-rates-offline");
    console.warn("DubemPay: could not fetch live exchange rates.", err);
  }

  refreshBtn.classList.remove("dp-rates-spinning");
  renderCurrencyChips();
}

function initCurrencyConverter() {
  document.getElementById("refreshRatesBtn").addEventListener("click", () => {
    playChime(700);
    fetchLiveRates();
  });
  fetchLiveRates(); // initial load
}


/**
 * plotBalanceSparkline
 * Draws the 30-day balance trend line in the SVG from appState.balanceHistory
 * — the demo account gets a real illustrative upward trend (BALANCE_HISTORY
 * below is its seed value, copied into appState once at first login); a
 * brand-new real account has no history yet, so it gets a flat line at
 * whatever its balance currently is (usually $0) instead of erroring out.
 * 🔧 EDIT HERE: once there's a backend, populate appState.balanceHistory
 * from real daily balances instead.
 */
const BALANCE_HISTORY = [
  10800, 10950, 10870, 11100, 11050, 11300, 11250, 11400, 11600, 11550,
  11700, 11650, 11900, 11800, 12000, 11950, 12100, 12050, 12200, 12150,
  12300, 12250, 12400, 12350, 12420, 12380, 12440, 12400, 12420, 12450,
];

function plotBalanceSparkline() {
  const svg = document.getElementById("balanceSparkline");
  if (!svg) return;

  const history =
    appState.balanceHistory && appState.balanceHistory.length
      ? appState.balanceHistory
      : Array(10).fill(appState.balance || 0);

  const width = 220;
  const height = 64;
  const padding = 4;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1; // guard against divide-by-zero if history is ever flat

  const points = history.map((value, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;

  // Built as a template string rather than individual DOM calls — simpler
  // for a one-shot chart draw like this one.
  svg.innerHTML = `
    <defs>
      <linearGradient id="dpSparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style="stop-color:var(--dp-accent-2); stop-opacity:0.35" />
        <stop offset="100%" style="stop-color:var(--dp-accent-2); stop-opacity:0" />
      </linearGradient>
    </defs>
    <path class="dp-sparkline-fill" d="${areaPath}"></path>
    <path class="dp-sparkline-line" d="${linePath}"></path>
  `;
}


/* -----------------------------------------------------------------
   4. AI ROUTING TRACKER — "Re-analyze route" simulation
----------------------------------------------------------------- */
function initRoutingTracker() {
  const btn = document.getElementById("rerunRouteBtn");
  const steps = Array.from(document.querySelectorAll("#routeTracker .dp-route-step"));

  btn.addEventListener("click", () => {
    // Reset every step back to "not started" (empty circle icon, no color classes)
    steps.forEach((step) => {
      step.classList.remove("is-done", "is-active");
      step.querySelector(".dp-route-dot").innerHTML = '<i class="bi bi-circle"></i>';
    });

    // Then reveal the steps one-by-one with a short delay, like a real analysis running.
    let stepIndex = 0;
    function advance() {
      if (stepIndex > 0) {
        // mark the previous step as fully done
        steps[stepIndex - 1].classList.remove("is-active");
        steps[stepIndex - 1].classList.add("is-done");
        steps[stepIndex - 1].querySelector(".dp-route-dot").innerHTML = '<i class="bi bi-check-lg"></i>';
      }
      if (stepIndex < steps.length) {
        steps[stepIndex].classList.add("is-active");
        steps[stepIndex].querySelector(".dp-route-dot").innerHTML = '<i class="bi bi-hourglass-split"></i>';
        stepIndex++;
        setTimeout(advance, 900); // 🔧 EDIT HERE: change 900 (ms) to speed up/slow down the simulation
      } else {
        playChime(880); // success chime once routing finishes
      }
    }
    advance();
  });
}


/* -----------------------------------------------------------------
   5. HOLOGRAPHIC CARD CONTROLS
----------------------------------------------------------------- */
function initCardControls() {
  const cardFlip = document.getElementById("cardFlip");
  const flipBtn = document.getElementById("flipCardBtn");
  const sheenBtn = document.getElementById("sheenToggleBtn");
  const freezeBtn = document.getElementById("freezeCardBtn");
  const faces = document.querySelectorAll(".dp-card-face");

  // Flip: rotate the card 180° to show the back (CVV side)
  flipBtn.addEventListener("click", () => {
    cardFlip.classList.toggle("is-flipped");
    playChime(700);
  });

  // Sheen: swap between the two holographic gradient variants defined in styles.css
  let usingSheenOne = true;
  sheenBtn.addEventListener("click", () => {
    usingSheenOne = !usingSheenOne;
    faces.forEach((face) => {
      face.classList.toggle("dp-holo-sheen-1", usingSheenOne);
      face.classList.toggle("dp-holo-sheen-2", !usingSheenOne);
    });
  });

  // Freeze: toggles a frosted "FROZEN" overlay + disables the other two buttons.
  // SECURITY: freezing/unfreezing a card is a sensitive action, so we ask for a
  // quick confirmation first rather than firing instantly on a single click —
  // the same pattern real banking apps use to prevent accidental taps.
  let isFrozen = false;
  freezeBtn.addEventListener("click", () => {
    const action = isFrozen ? "unfreeze" : "freeze";
    const confirmed = window.confirm(`Are you sure you want to ${action} this card?`);
    if (!confirmed) return; // user backed out — change nothing

    isFrozen = !isFrozen;
    cardFlip.classList.toggle("is-frozen", isFrozen);
    freezeBtn.innerHTML = isFrozen
      ? '<i class="bi bi-snow2"></i> Unfreeze card'
      : '<i class="bi bi-snow"></i> Freeze card';
    flipBtn.disabled = isFrozen;
    sheenBtn.disabled = isFrozen;
    playChime(isFrozen ? 500 : 750);
  });
}


/* -----------------------------------------------------------------
   5a. CARDS — Physical / Virtual tab switching + demo actions
   (Physical/Virtual panels, incomplete-application banner, action
   grid and dispute banner markup all live in index.html; this just
   wires the interactive bits — none of it touches a real backend.)
----------------------------------------------------------------- */
function initCardTabs() {
  const tabs = document.querySelectorAll("[data-card-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.cardTab;
      document.querySelectorAll("[data-card-panel]").forEach((panel) => {
        panel.classList.toggle("d-none", panel.dataset.cardPanel !== target);
      });
      playChime(700);
    });
  });

  // "Continue to apply" — demo-only, same honest toast pattern as the rest of the app
  const continueBtn = document.getElementById("continueApplyBtn");
  continueBtn?.addEventListener("click", () => {
    showToast("🔧 Physical card application — connect this to a real issuance flow when you have one.");
    fireCta(continueBtn);
    playChime(700);
  });

  // Dispute banner "View" button
  const disputeBtn = document.getElementById("disputeViewBtn");
  disputeBtn?.addEventListener("click", () => {
    showToast("🔧 Manage Dispute — connect this to a real support/dispute flow when you have one.");
    fireCta(disputeBtn);
    playChime(700);
  });

  // Live countdown for the 25%-off physical card discount. Purely
  // decorative/demo — counts down from a fixed 18-day-23-hour window
  // set the moment this loads, same spirit as the routing tracker demo.
  const countdownEl = document.getElementById("physicalDiscountCountdown");
  if (countdownEl) {
    const deadline = Date.now() + (18 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000);
    const tick = () => {
      const msLeft = deadline - Date.now();
      if (msLeft <= 0) {
        countdownEl.textContent = "Expired";
        return;
      }
      const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
      const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      countdownEl.textContent = `${days}d ${hours}h`;
    };
    tick();
    setInterval(tick, 60 * 1000); // refresh once a minute — plenty for an hour-granularity readout
  }
}


/* -----------------------------------------------------------------
   6. ONE-CLICK INVOICING
----------------------------------------------------------------- */
function initInvoicing() {
  const form = document.getElementById("invoiceForm");
  const amountInput = document.getElementById("invoiceAmount");
  const clientInput = document.getElementById("invoiceClient");
  const submitBtn = document.getElementById("invoiceSubmitBtn");
  const resultBox = document.getElementById("invoiceResult");
  const linkOutput = document.getElementById("invoiceLinkOutput");
  const copyBtn = document.getElementById("copyInvoiceLinkBtn");
  const copiedMsg = document.getElementById("invoiceCopiedMsg");

  // A client name is allowed to contain letters, numbers, spaces and a small
  // set of everyday punctuation — nothing that looks like an HTML tag.
  // SECURITY: rejecting "<" and ">" outright means even if escapeHTML() were
  // ever skipped somewhere downstream, there's still nothing tag-shaped to inject.
  const SAFE_TEXT_PATTERN = /^[a-zA-Z0-9 .,'\-&()]+$/;

  /**
   * validateInvoiceForm
   * Checks both fields, shows/clears error styling+messages on each,
   * and returns true only if everything passes.
   */
  function validateInvoiceForm() {
    let isValid = true;

    const amount = parseFloat(amountInput.value);
    if (!amountInput.value || isNaN(amount) || amount < 1 || amount > 1000000) {
      showFieldError(amountInput);
      isValid = false;
    } else {
      clearFieldError(amountInput);
    }

    const client = clientInput.value.trim();
    const clientLengthOk = client.length >= 3 && client.length <= 80;
    const clientCharsOk = SAFE_TEXT_PATTERN.test(client);
    if (!clientLengthOk || !clientCharsOk) {
      showFieldError(clientInput);
      isValid = false;
    } else {
      clearFieldError(clientInput);
    }

    return isValid;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // stop the browser's default "reload the page" form behavior

    if (!validateInvoiceForm()) {
      return; // errors are already visible on the fields — nothing more to do
    }

    const amount = amountInput.value;
    const client = clientInput.value.trim();

    // Invoice generation is treated as "basically always succeeds" (it's
    // just building a link, nothing external to fail) — but it still goes
    // through the loading state so the button gives real feedback rather
    // than the link appearing instantly with no transition.
    const success = await withButtonLoading(submitBtn, {
      loadingText: "Generating…",
      successRate: 0.98,
    });

    if (!success) {
      showToast("❌ Couldn't generate the invoice link — please try again.", "error");
      playChime(500);
      return;
    }

    // Build a fake-but-realistic-looking shareable link.
    // 🔧 EDIT HERE: point this at your real domain once DubemPay has a backend.
    const slug = client
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // turn spaces/punctuation into dashes
      .replace(/(^-|-$)/g, "");    // trim leading/trailing dashes
    const fakeId = Math.random().toString(36).slice(2, 8); // short random ID, just for realism
    const link = `https://pay.dubempay.com/invoice/${slug || "client"}-${fakeId}?amt=${encodeURIComponent(amount)}`;

    linkOutput.value = link; // .value (not innerHTML) is always safe from injection
    resultBox.classList.remove("d-none");
    copiedMsg.textContent = "";

    fireCta(submitBtn);
    playChime(920); // higher, brighter tone = "success" across the app
  });

  copyBtn.addEventListener("click", async () => {
    try {
      // navigator.clipboard is the modern browser API for copy-to-clipboard.
      await navigator.clipboard.writeText(linkOutput.value);
      copiedMsg.textContent = "✅ Link copied to clipboard!";
    } catch (err) {
      // Fallback for older browsers: select the text so the user can Ctrl/Cmd+C manually.
      linkOutput.select();
      copiedMsg.textContent = "Press Ctrl/Cmd+C to copy (auto-copy isn't supported here).";
    }
  });
}




/* -----------------------------------------------------------------
   11. MISC small wire-ups (Add Money / Send buttons play chime + CTA fire)
----------------------------------------------------------------- */
function initMiscButtons() {
  const addMoneyBtn = document.getElementById("addMoneyBtn");
  const sendMoneyBtn = document.getElementById("sendMoneyBtn");

  addMoneyBtn.addEventListener("click", async () => {
    // 🔧 EDIT HERE: hook this up to a real "add money" flow/modal (amount entry,
    // funding source) when you have one — this demo adds a fixed $50 so the
    // balance is visibly live state instead of a static number.
    // successRate is high but not 100% — funding rarely fails, but it can
    // (card declined, bank timeout), so the UI should be able to show that.
    const success = await withButtonLoading(addMoneyBtn, {
      loadingText: "Adding…",
      successRate: 0.93,
    });
    if (success) {
      appState.balance = (appState.balance || 0) + 50;
      if (appState.balanceHistory?.length) appState.balanceHistory.push(appState.balance);
      persistState();
      renderBalance();
      renderCurrencyChips();
      plotBalanceSparkline();
      fireCta(addMoneyBtn);
      showSuccessPage({
        title: "Money Added",
        amount: "$50.00",
        details: [{ label: "Reference", value: generateRef() }],
      });
    } else {
      showToast("❌ Couldn't add money — your funding source declined the request.", "error");
      playChime(500);
    }
  });

  sendMoneyBtn.addEventListener("click", async () => {
    // 🔧 EDIT HERE: hook this up to a real "send money" flow/modal (recipient,
    // amount) when you have one — this demo sends a fixed $20.
    // Transfers fail more often than deposits in real life (wrong details,
    // recipient bank down, etc.), so this one gets a lower success rate.
    const success = await withButtonLoading(sendMoneyBtn, {
      loadingText: "Sending…",
      successRate: 0.85,
    });
    if (success) {
      appState.balance = Math.max(0, (appState.balance || 0) - 20);
      if (appState.balanceHistory?.length) appState.balanceHistory.push(appState.balance);
      persistState();
      renderBalance();
      renderCurrencyChips();
      plotBalanceSparkline();
      fireCta(sendMoneyBtn);
      showSuccessPage({
        title: "Transfer Sent",
        amount: "$20.00",
        details: [{ label: "Reference", value: generateRef() }],
      });
    } else {
      showToast("❌ Transfer failed — check your connection and try again.", "error");
      playChime(500);
    }
  });
}


