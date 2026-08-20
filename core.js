/* =================================================================
   DUBEMPAY — core.js
   =================================================================
   Loaded FIRST (before dashboard.js / features.js / ui.js). Contains:
     - Shared helpers used by every other file (formatMoney, playChime,
       fireCta, escapeHTML, showToast, form-validation helpers)
     - The whole front-end-only auth system (accounts, session,
       per-account appState persistence, login/signup/logout UI)
     - The final DOMContentLoaded listener that boots every other
       module, once all four scripts have finished loading

   Why split into 4 files: app.js had grown to ~1,500 lines in one
   file. That's still totally readable with the section comments, but
   past a certain size a real team would split it — this mirrors that,
   without changing how anything behaves. All four files share one
   global scope (no bundler, no modules/import), so load order matters:
   core.js → dashboard.js → features.js → ui.js, exactly as listed in
   index.html's closing <script> tags.
   ================================================================= */


/* -----------------------------------------------------------------
   1. SHARED HELPERS
----------------------------------------------------------------- */

/**
 * formatMoney
 * Turns a plain number into a "$1,234.56"-style string.
 * We centralize this so every balance/price in the app looks consistent.
 * @param {number} value - the raw number, e.g. 1234.5
 * @param {string} symbol - currency symbol to prefix, defaults to "$"
 */
function formatMoney(value, symbol = "$") {
  // toLocaleString adds the thousands-separator commas for us.
  return (
    symbol +
    value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/**
 * playChime
 * Uses the native Web Audio API (no MP3 files needed!) to generate a
 * short, soft, futuristic "beep" tone. We build the sound from scratch:
 * an oscillator (the tone generator) run through a gain node (the volume
 * control) so we can fade it in and out smoothly instead of a harsh click.
 *
 * @param {number} frequency - pitch of the tone in Hz (higher = higher pitch)
 */
/**
 * generateRef
 * A short fake transaction reference for receipt-style confirmation
 * pages — purely cosmetic, no server round-trip behind it.
 */
function generateRef() {
  return "DP" + Math.floor(100000000 + Math.random() * 900000000);
}

function playChime(frequency = 880) {
  try {
    // AudioContext is the browser's built-in sound engine.
    // "webkitAudioContext" is the old Safari name — this fallback keeps it working there too.
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const oscillator = ctx.createOscillator(); // generates the raw tone
    const gainNode = ctx.createGain();          // controls how loud it is over time

    oscillator.type = "sine";                   // "sine" = smooth, soft tone (not harsh/buzzy)
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Volume envelope: silent -> quiet peak -> silent again (a "chime" shape, not a flat beep)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02); // quick fade in
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4); // slow fade out

    // Wire it up: oscillator -> gain -> speakers, then start/stop it.
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (err) {
    // Some browsers block audio until the user interacts with the page at least once.
    // We fail silently here so a blocked chime never breaks the actual feature.
    console.warn("DubemPay: audio chime could not play.", err);
  }
}

/**
 * fireCta
 * Adds a short animation class to a button (see .dp-cta-fire in styles.css)
 * so its little arrow "shoots" forward — the micro-interaction the brief
 * asked for on successful payment actions / form submissions.
 * @param {HTMLElement} button
 */
function fireCta(button) {
  if (!button) return;
  button.classList.add("dp-cta-fire");
  // Remove the class after the animation finishes so it can replay next time.
  setTimeout(() => button.classList.remove("dp-cta-fire"), 550);
}


/**
 * escapeHTML
 * SECURITY: converts special HTML characters (< > & " ') into their safe
 * "entity" equivalents (&lt; &gt; etc.) before we ever insert user-typed
 * text into the page with innerHTML. Without this, someone could type
 * something like <img src=x onerror="..."> into a text field and have
 * the browser actually execute it — a classic attack called XSS
 * (Cross-Site Scripting). Any time we build HTML strings out of text
 * that came from an <input>, we run it through this function first.
 * @param {string} str
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str; // textContent never executes HTML — that's the trick
  return div.innerHTML;  // reading innerHTML back out now gives us the escaped version
}

/**
 * showFieldError / clearFieldError
 * Small pair of helpers that toggle Bootstrap's .is-invalid class (styled
 * in styles.css) on a single form field, matched to its .invalid-feedback
 * message. Used by both the invoice form and the subscription form so we
 * don't repeat this logic twice.
 */
function showFieldError(inputEl) {
  inputEl.classList.add("is-invalid");
  inputEl.classList.remove("is-valid");
}
function clearFieldError(inputEl) {
  inputEl.classList.remove("is-invalid");
  inputEl.classList.add("is-valid");
}


/**
 * showToast
 * Shows the shared bottom-right toast (see #dpToast in index.html) with a
 * custom message. Used by Quick Services and Promotions since those are
 * demo-only buttons with nothing real to open yet — and by the loading-
 * state helper below for simulated success/error results.
 * @param {string} message
 * @param {"info"|"error"} type - "error" swaps the icon/color and stays
 *   on screen a little longer, since a failure message is worth reading
 *   fully rather than glancing at.
 */
function showToast(message, type = "info") {
  const toastEl = document.getElementById("dpToast");
  const iconEl = toastEl.querySelector("i");
  document.getElementById("dpToastMsg").textContent = message;

  toastEl.classList.toggle("dp-toast-error", type === "error");
  iconEl.className = type === "error" ? "bi bi-exclamation-triangle-fill" : "bi bi-info-circle-fill";

  // getOrCreateInstance reuses the same toast instead of stacking duplicates
  // if the user clicks several quick-service buttons in a row.
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: type === "error" ? 3800 : 2200 });
  toast.show();
}

/**
 * showSuccessPage
 * A full-page confirmation shown after a real money-moving action
 * completes — Airtime/Betting/Electricity/Data/TV payments, bank &
 * wallet transfers, SafeBox, Flex Save, Loan disbursement, subscription
 * linking, target creation, and so on. This replaces the small toast
 * that used to be the only feedback for these. Minor, non-transaction
 * confirmations (password updated, feedback sent, a setting toggled)
 * are unaffected and still use showToast() — turning those into a full
 * page to navigate away from would be worse UX, not better.
 * @param {object} options
 * @param {string} [options.title="Payment Successful"]
 * @param {string} [options.message] - one-line description under the title
 * @param {string} [options.amount] - large pre-formatted amount, e.g. "$2,000.00"
 * @param {Array<{label:string, value:string}>} [options.details] - receipt-style key/value rows (e.g. Provider, Reference, Date)
 */
function showSuccessPage(options = {}) {
  const { title = "Payment Successful", message = "", amount = "", details = [] } = options;

  document.getElementById("successPageTitle").textContent = title;
  document.getElementById("successPageMessage").textContent = message;
  document.getElementById("successPageMessage").classList.toggle("d-none", !message);

  const amountEl = document.getElementById("successPageAmount");
  amountEl.textContent = amount;
  amountEl.classList.toggle("d-none", !amount);

  const detailsEl = document.getElementById("successPageDetails");
  detailsEl.innerHTML = details
    .map((d) => `<div class="dp-success-detail-row"><span>${d.label}</span><span>${d.value}</span></div>`)
    .join("");
  detailsEl.classList.toggle("d-none", details.length === 0);

  playChime(920);
  bootstrap.Modal.getOrCreateInstance(document.getElementById("successModal")).show();
}

/**
 * withButtonLoading
 * Puts a button into a spinner/"Processing…" state, waits a short
 * simulated network delay, then resolves true/false to mimic a real
 * request that can succeed OR fail. This is what makes Send Money, Add
 * Money, invoicing, and subscription-linking feel like they're actually
 * talking to a server instead of resolving instantly and always working —
 * closer to what a real integration would need to handle.
 * @param {HTMLElement} btn
 * @param {object} options
 * @param {string} [options.loadingText="Processing…"]
 * @param {number} [options.successRate=1] - 1 = never fails, 0.85 = fails ~15% of the time
 * @param {number} [options.minDelay=550]
 * @param {number} [options.maxDelay=950]
 * @returns {Promise<boolean>} resolves true on simulated success, false on simulated failure
 */
function withButtonLoading(btn, options = {}) {
  const {
    loadingText = "Processing…",
    successRate = 1,
    minDelay = 550,
    maxDelay = 950,
  } = options;

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.innerHTML = `<span class="dp-btn-spinner" aria-hidden="true"></span> ${loadingText}`;

  const delay = minDelay + Math.random() * (maxDelay - minDelay);

  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() < successRate;
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.innerHTML = originalHTML;
      resolve(success);
    }, delay);
  });
}


/* -----------------------------------------------------------------
   1a. ACCOUNTS + SESSION (front-end-only auth, via localStorage)
   =====================================================================
   IMPORTANT SECURITY NOTE — read this before reusing any of this code:
   There is no backend here. "Accounts" are just an object saved in this
   browser's localStorage, and "login" just means the browser remembers
   which account you picked. Anyone with access to this browser (or its
   dev tools) can read every stored account. Hashing the password with
   SHA-256 below stops it being saved in plain text, which is better
   than nothing, but it is NOT real security — a real app must verify
   credentials on a server it controls, over HTTPS, with rate limiting,
   and never trust the client alone. Treat this exactly like it is:
   a believable login flow for a front-end demo, not a production auth
   system.
----------------------------------------------------------------- */

const ACCOUNTS_KEY = "dubempay_accounts";  // { [email]: { name, email, passwordHash, createdAt } }
const SESSION_KEY = "dubempay_session";    // the currently logged-in email, or nothing

/**
 * Session storage helpers — "Remember me" decides WHICH storage a session
 * lives in, not just whether it exists:
 *   - checked  → localStorage: survives closing the browser entirely
 *   - unchecked → sessionStorage: gone the moment this tab/window closes
 * getSession() checks both so a page reload always finds whichever one is
 * active; setSession()/clearSession() always touch both to avoid a stale
 * copy lingering in the other one.
 */
function setSession(email, remember) {
  if (remember) {
    localStorage.setItem(SESSION_KEY, email);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, email);
    localStorage.removeItem(SESSION_KEY);
  }
}
function getSession() {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

// currentUser + appState are the two pieces of "who's logged in and what
// have they done" that the rest of app.js reads from and writes to.
// They start empty and get filled in by restoreSessionOrShowAuth() (if a
// session already exists) or logInAs() (right after login/signup).
let currentUser = null;              // { email, name } | null
let appState = {                     // per-account app data, persisted to localStorage
  theme: null,
  tier: 1,
  subscriptions: null,               // null = "not loaded yet", see initSubscriptions
  balance: 0,
  transactions: [],
  recentActivity: [],
  balanceHistory: null,
  securityQuestionsSet: false,
  settings: {
    smsDebit: false, smsCredit: false, smsLogin: false, clipboardAccess: false,
    defaultFundingSource: "balance", defaultSavingsFrequency: "Weekly", roundUp: false,
    homeShowSplitter: true, homeShowRouting: true, homeShowHeatmap: true, homepageSettingsSeen: false,
    ussdEnabled: true,
  },
  savings: {
    oWealth: 0, oWealthInterestToday: 0, oWealthActivity: [],
    safeBox: 0, safeBoxSchedule: null,
    spendSave: 0, spendSaveInterest: 0, spendSavePercent: 0, spendSaveWeeklyTimes: 0, spendSaveActivity: [],
    targets: 0, targetsList: [],
    flexSave: 0, flexSaveInterest: 0, flexSaveActivity: [],
  },
};

/**
 * DEMO_EMAIL / getDefaultAppState
 * The whole rest of the app treats appState as the single source of truth
 * for money — balance, transactions, recent activity, subscriptions. This
 * is where the two starting points diverge:
 *   - the ONE demo account (DEMO_EMAIL) gets the rich, populated seed data
 *     (see BASE_BALANCE_USD/TRANSACTIONS/RECENT_ACTIVITY/BALANCE_HISTORY
 *     in dashboard.js and STARTER_SUBSCRIPTIONS in features.js) so there's
 *     something to demo/grade without manual setup.
 *   - every REAL signup gets a genuinely empty account: $0 balance, no
 *     transactions, no activity, no subscriptions, Tier 1. Exactly what a
 *     brand-new user of a real fintech app would see.
 * Called from logInAs() only when loadAppState() finds nothing saved yet
 * for that email (i.e. this is that account's very first login) — a
 * returning user's own saved state always wins over either seed.
 */
const DEMO_EMAIL = "demo@dubempay.com";

function getDefaultAppState(email) {
  if (email === DEMO_EMAIL) {
    return {
      theme: null,
      tier: 3,
      subscriptions: null, // null → initSubscriptions() seeds STARTER_SUBSCRIPTIONS
      balance: typeof BASE_BALANCE_USD === "number" ? BASE_BALANCE_USD : 12450,
      transactions: typeof TRANSACTIONS !== "undefined" ? TRANSACTIONS.map((t) => ({ ...t })) : [],
      recentActivity: typeof RECENT_ACTIVITY !== "undefined" ? RECENT_ACTIVITY.map((a) => ({ ...a })) : [],
      balanceHistory: typeof BALANCE_HISTORY !== "undefined" ? [...BALANCE_HISTORY] : null,
      // OWealth is the one savings product seeded non-zero for the demo
      // account (it's the "everyday overflow" product, so it's realistic
      // for it to already hold something) — SafeBox/Targets/Spend & Save
      // start at zero/empty even for demo, matching how those screens
      // look in the reference screenshots for an account that hasn't
      // set them up yet.
      savings: {
        oWealth: 1240.5,
        oWealthInterestToday: 1.94,
        oWealthActivity: [
          { icon: "bi-percent", type: "interest", desc: "OWealth Interest Earned", time: "Aug 14, 2:57 AM", amount: 1.94, status: "Successful" },
          { icon: "bi-arrow-down", type: "incoming", desc: "AutoSave Deposit", time: "Aug 14, 7:37 PM", amount: 20.0, status: "Successful" },
          { icon: "bi-arrow-up", type: "outgoing", desc: "Withdrawal (Transfer)", time: "Aug 13, 11:33 AM", amount: -35.0, status: "Successful" },
        ],
        safeBox: 0,
        safeBoxSchedule: null,
        spendSave: 0,
        spendSaveInterest: 0,
        spendSavePercent: 0,
        spendSaveWeeklyTimes: 0,
        spendSaveActivity: [],
        targets: 0,
        targetsList: [],
        flexSave: 0,
        flexSaveInterest: 0,
        flexSaveActivity: [],
      },
      securityQuestionsSet: false,
      settings: {
    smsDebit: false, smsCredit: false, smsLogin: false, clipboardAccess: false,
    defaultFundingSource: "balance", defaultSavingsFrequency: "Weekly", roundUp: false,
    homeShowSplitter: true, homeShowRouting: true, homeShowHeatmap: true, homepageSettingsSeen: false,
    ussdEnabled: true,
  },
    };
  }
  return {
    theme: null,
    tier: 1,
    subscriptions: [],  // already an array (not null) → won't trigger the demo seed
    balance: 0,
    transactions: [],
    recentActivity: [],
    balanceHistory: null,
    savings: {
      oWealth: 0,
      oWealthInterestToday: 0,
      oWealthActivity: [],
      safeBox: 0,
      safeBoxSchedule: null,
      spendSave: 0,
      spendSaveInterest: 0,
      spendSavePercent: 0,
      spendSaveWeeklyTimes: 0,
      spendSaveActivity: [],
      targets: 0,
      targetsList: [],
      flexSave: 0,
      flexSaveInterest: 0,
      flexSaveActivity: [],
    },
    securityQuestionsSet: false,
    settings: {
    smsDebit: false, smsCredit: false, smsLogin: false, clipboardAccess: false,
    defaultFundingSource: "balance", defaultSavingsFrequency: "Weekly", roundUp: false,
    homeShowSplitter: true, homeShowRouting: true, homeShowHeatmap: true, homepageSettingsSeen: false,
    ussdEnabled: true,
  },
  };
}

/**
 * hashPassword
 * Turns a password into a SHA-256 hex digest using the browser's built-in
 * Web Crypto API — no external library needed. See the security note above:
 * this makes localStorage snooping slightly less trivial, nothing more.
 */
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {};
  } catch {
    return {}; // corrupted/blocked storage — fail safe to "no accounts" rather than crash
  }
}
function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getStateKey(email) {
  return `dubempay_state_${email}`;
}
function loadAppState(email) {
  try {
    const saved = JSON.parse(localStorage.getItem(getStateKey(email)));
    if (!saved) return null;
    // Defensive merge: a state saved before a given field existed (e.g.
    // before the savings-product modals were added) shouldn't crash the
    // app — backfill anything missing from a fresh default instead of
    // assuming every saved state has every current field.
    const fallback = getDefaultAppState(email);
    return {
      ...fallback,
      ...saved,
      savings: { ...fallback.savings, ...(saved.savings || {}) },
    };
  } catch {
    return null;
  }
}
/**
 * persistState
 * Saves the current appState under the logged-in user's own key. Called
 * after every meaningful change (theme toggle, tier upgrade, subscription
 * add/pause/unlink) so a refresh or a later login picks up right where
 * you left off. No-ops safely if nobody's logged in.
 */
function persistState() {
  if (!currentUser) return;
  localStorage.setItem(getStateKey(currentUser.email), JSON.stringify(appState));
}

// 🔧 EDIT HERE: how long a session can sit idle before we log it out
// automatically. 20 minutes is a common default for apps handling money.
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000;
let inactivityTimeoutId = null;

/**
 * startInactivityTimer
 * Auto-logs-out after INACTIVITY_LIMIT_MS of no mouse/keyboard/touch
 * activity — called once right after login/signup and once on a restored
 * session. A single shared timer gets reset by activity, rather than
 * re-registering listeners on every event.
 */
function startInactivityTimer() {
  const resetTimer = () => {
    clearTimeout(inactivityTimeoutId);
    inactivityTimeoutId = setTimeout(() => {
      clearSession();
      // 🔧 EDIT HERE: a real app might show a "you're about to be logged
      // out" warning first — this demo goes straight to logging out.
      alert("You've been logged out after 20 minutes of inactivity.");
      location.reload();
    }, INACTIVITY_LIMIT_MS);
  };

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, resetTimer, { passive: true });
  });

  resetTimer();
}

function showAuthError(el, message) {
  el.textContent = message;
}
function clearAuthError(el) {
  el.textContent = "";
}

/**
 * updateGreetingUI
 * Pushes the logged-in account's name into every place the UI shows it:
 * the dashboard greeting, the navbar avatar initials, and the profile
 * dropdown header line.
 */
function updateGreetingUI(name) {
  const firstName = name.trim().split(/\s+/)[0];
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  document.getElementById("greetingText").textContent = `Welcome back, ${firstName}`;
  document.getElementById("navAvatar").textContent = initials;
  document.getElementById("profileGreetingText").textContent = `Hi, ${firstName} 👋`;
}

/**
 * initSocialAuth
 * Wires up the "Continue with Google" / "Continue with Apple" buttons.
 * SECURITY / HONESTY NOTE: there is no OAuth backend here to actually
 * hand off to — a real integration needs a registered app with Google/
 * Apple, a redirect URI, and a server to verify the returned token. Since
 * none of that exists in this demo, these buttons are visual-only and say
 * so plainly via a toast rather than silently doing nothing (confusing)
 * or faking a successful login (actively misleading).
 * 🔧 EDIT HERE: once you have a backend, replace the toast calls below
 * with a real redirect to Google Identity Services / Sign in with Apple JS.
 */
function initSocialAuth() {
  document.getElementById("googleAuthBtn").addEventListener("click", () => {
    showToast("🔧 Google Sign-In isn't connected in this demo — it needs a real backend + OAuth app to work.");
  });
  document.getElementById("appleAuthBtn").addEventListener("click", () => {
    showToast("🔧 Sign in with Apple isn't connected in this demo — it needs a real backend + OAuth app to work.");
  });
}

/**
 * initAuthScreen
 * Wires up the Log In / Sign Up tabs and forms, plus the Log Out link.
 * This only sets up event listeners — restoreSessionOrShowAuth (called
 * separately, before this) decides which screen is actually visible
 * when the page first loads.
 */
function initAuthScreen() {
  const authScreen = document.getElementById("authScreen");
  const appShell = document.getElementById("appShell");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");
  const loginTabBtn = document.querySelector('[data-auth-tab="login"]');
  const signupTabBtn = document.querySelector('[data-auth-tab="signup"]');

  function switchAuthTab(tab) {
    const showLogin = tab === "login";
    loginForm.classList.toggle("d-none", !showLogin);
    signupForm.classList.toggle("d-none", showLogin);
    loginTabBtn.classList.toggle("active", showLogin);
    signupTabBtn.classList.toggle("active", !showLogin);
    clearAuthError(loginError);
    clearAuthError(signupError);
  }
  loginTabBtn.addEventListener("click", () => switchAuthTab("login"));
  signupTabBtn.addEventListener("click", () => switchAuthTab("signup"));

  /**
   * logInAs
   * The one function both "successful login" and "successful signup" call:
   * saves the session, loads (or starts) this account's appState, reveals
   * the dashboard, personalizes the greeting/avatar, and — since this is
   * the first moment appState reflects a real account — initializes every
   * dashboard module now rather than earlier at page load, when appState
   * was still just an empty placeholder.
   */
  function logInAs(email, name, remember = true) {
    setSession(email, remember);
    currentUser = { email, name };
    appState = loadAppState(email) || getDefaultAppState(email);

    authScreen.classList.add("d-none");
    appShell.classList.remove("d-none");
    updateGreetingUI(name);
    initDashboardModules();
    startInactivityTimer();
  }

  // --- SIGN UP ---
  const SAFE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z .'-]{1,49}$/;
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthError(signupError);

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (!SAFE_NAME_PATTERN.test(name)) {
      showAuthError(signupError, "Enter your name using letters only (2–50 characters).");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showAuthError(signupError, "Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      showAuthError(signupError, "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      showAuthError(signupError, "Passwords don't match.");
      return;
    }

    const accounts = getAccounts();
    if (accounts[email]) {
      showAuthError(signupError, "An account with this email already exists — try logging in instead.");
      return;
    }

    const submitBtn = signupForm.querySelector("button[type=submit]");
    submitBtn.disabled = true; // SECURITY: prevent double-submit while the hash is computing

    accounts[email] = {
      name,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    saveAccounts(accounts);

    logInAs(email, name);
    playChime(950);
    submitBtn.disabled = false;
  });

  // --- DEMO ACCOUNT ---
  // Logs straight into the one shared demo account (seeded with sample
  // balance/transactions/subscriptions by getDefaultAppState) without
  // touching the login/signup forms at all. Registered in `accounts` too
  // (silently, if it isn't already) so anything that expects an account
  // record to exist — e.g. a future "My Profile" edit — doesn't break.
  document.getElementById("demoAccountBtn").addEventListener("click", () => {
    const accounts = getAccounts();
    if (!accounts[DEMO_EMAIL]) {
      accounts[DEMO_EMAIL] = {
        name: "Demo Account",
        email: DEMO_EMAIL,
        passwordHash: null, // never used for login — this button bypasses the password form entirely
        createdAt: new Date().toISOString(),
      };
      saveAccounts(accounts);
    }
    logInAs(DEMO_EMAIL, "Demo Account");
    playChime(920);
  });

  // --- LOG IN ---
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthError(loginError);

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const accounts = getAccounts();
    const account = accounts[email];
    if (!account) {
      showAuthError(loginError, "No account found with that email.");
      return;
    }

    const submitBtn = loginForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const attemptedHash = await hashPassword(password);
    if (attemptedHash !== account.passwordHash) {
      showAuthError(loginError, "Incorrect password.");
      submitBtn.disabled = false;
      return;
    }

    const remember = document.getElementById("rememberMe").checked;
    logInAs(email, account.name, remember);
    playChime(920);
    submitBtn.disabled = false;
  });

  // --- LOG OUT ---
  // Two logout controls now exist (the sidebar footer + the profile
  // dropdown), both marked with the same .js-logout class, so one loop
  // wires them both up identically.
  document.querySelectorAll(".js-logout").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      // A full reload is the simplest reliable way to reset every dashboard
      // module (theme, tier badges, subscription cards, etc.) back to a
      // clean slate before the next person logs in on this browser.
      location.reload();
    });
  });

  // --- FORGOT PASSWORD ---
  // 🔧 EDIT HERE: this is a front-end-only demo, so there's no email
  // service to actually send a reset link through — wire this up to a
  // real password-reset flow once there's a backend.
  document.getElementById("forgotPasswordBtn").addEventListener("click", () => {
    showToast("🔧 Password reset isn't wired up in this demo — connect it to a real email flow when you have a backend.");
  });
}

/**
 * restoreSessionOrShowAuth
 * Runs once, before any other module initializes: checks whether a
 * session + matching account already exist, and either reveals the
 * dashboard (loading that account's saved appState) or leaves the
 * Auth screen showing. Must run before initThemeSwitcher/initTierSystem/
 * initSubscriptions, since they all read appState at startup.
 */
function restoreSessionOrShowAuth() {
  const authScreen = document.getElementById("authScreen");
  const appShell = document.getElementById("appShell");
  const email = getSession();
  const accounts = getAccounts();

  if (email && accounts[email]) {
    currentUser = { email, name: accounts[email].name };
    appState = loadAppState(email) || getDefaultAppState(email);
    authScreen.classList.add("d-none");
    appShell.classList.remove("d-none");
    updateGreetingUI(currentUser.name);
    startInactivityTimer();
    return true; // a real session was restored
  }

  authScreen.classList.remove("d-none");
  appShell.classList.add("d-none");
  return false; // still on the Auth screen — dashboard modules must wait
}


/* -----------------------------------------------------------------
   12. INIT — run everything once the DOM is fully parsed
----------------------------------------------------------------- */

/**
 * initDashboardModules
 * Every dashboard feature's setup, grouped into one call. This only ever
 * runs once real account data is in appState — either because a session
 * was already there on page load, or because logInAs() just created one.
 * Running it any earlier (e.g. unconditionally at DOMContentLoaded) is
 * what caused a bug where cards built against a placeholder appState
 * kept references to the wrong object after a real login replaced it.
 */
function initDashboardModules() {
  initThemeSwitcher();
  initBalanceControls();
  plotBalanceSparkline();
  initCurrencyConverter();
  initRecentActivity();
  initRoutingTracker();
  initCardControls();
  initCardTabs();
  initInvoicing();
  initSubscriptions();
  initTransactions();
  initSearch();
  initTierSystem();
  initQuickServices();
  initDataModal();
  initAirtimeModal();
  initElectricityModal();
  initSavingsProducts();
  initServiceModals();
  initRewardsAndSavings();
  initHotDeal();
  initHelpCenter();
  initFaqAccordion();
  initSettingsModal();
  initUssdModal();
  initBankSelectModal();
  initTransferRecipientPickers();
  initSidebar();
  initBottomNav();
  initPageRouter();
  initMeSection();
  initMiscButtons();

  console.log("DubemPay dashboard ready ✅ — all modules initialized.");
}

document.addEventListener("DOMContentLoaded", () => {
  // Auth must run FIRST — it decides whether the dashboard shows at all.
  const alreadyLoggedIn = restoreSessionOrShowAuth();
  initAuthScreen();
  initSocialAuth();

  // Only initialize the dashboard now if a session already existed. If not,
  // initAuthScreen's logInAs() will call initDashboardModules() itself the
  // moment the person actually logs in or signs up.
  if (alreadyLoggedIn) {
    initDashboardModules();
  }
});
