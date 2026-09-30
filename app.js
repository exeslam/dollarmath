/* Dollar Math · page logic: links from config, email capture, and the live calculator. */
(function () {
  "use strict";
  var C = window.DM_CONFIG || { links: {}, email: { provider: "gumroad" } }, E = window.DMEngine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var money = function (v) { return "$" + Math.round(v).toLocaleString("en-US"); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // links + price from config
  document.querySelectorAll("[data-link]").forEach(function (a) {
    var href = C.links[a.getAttribute("data-link")];
    if (href) { a.href = href; if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; } }
  });
  document.querySelectorAll("[data-price]").forEach(function (el) { if (C.price) el.textContent = C.price; });

  // email capture
  var cap = $("#capture");
  if (cap) {
    var em = C.email || {};
    if (em.provider === "form" && em.action) {
      var hidden = Object.keys(em.hidden || {}).map(function (k) { return '<input type="hidden" name="' + esc(k) + '" value="' + esc(em.hidden[k]) + '">'; }).join("");
      cap.innerHTML = '<form method="post" action="' + esc(em.action) + '">' + hidden +
        '<input type="email" name="' + esc(em.field || "email") + '" placeholder="you@email.com" required autocomplete="email" aria-label="Email">' +
        '<button class="btn" type="submit">Send me the sheet</button></form>' +
        '<p class="small" style="margin-top:12px">We\'ll email you the link. No spam, unsubscribe in one click. <a href="privacy.html">Privacy</a></p>';
    } else {
      cap.innerHTML = '<a class="btn" href="' + esc(C.links.free || "#") + '" target="_blank" rel="noopener">Get the free sheet</a>' +
        '<p class="small" style="margin-top:12px">Opens Gumroad. Type your email, pay $0, get the Google Sheet instantly.</p>';
    }
  }

  // ---------------------------------------------------------------- calculator
  var SAMPLE = {
    budget: 1000, start: "2026-10",
    debts: [
      { name: "Medical bill", balance: 600, apr: 0, minimum: 50 },
      { name: "Store card", balance: 1400, apr: 29.99, minimum: 40 },
      { name: "Visa", balance: 7900, apr: 24.99, minimum: 200 },
      { name: "Car loan", balance: 9800, apr: 7.9, minimum: 280 },
      { name: "Student loan", balance: 3500, apr: 4.99, minimum: 60 }
    ]
  };
  var KEY = "dm-calc-v1", state;
  try { state = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { state = null; }
  if (!state || !Array.isArray(state.debts)) state = JSON.parse(JSON.stringify(SAMPLE));
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } };

  var tbody = $("#debts tbody"), budgetEl = $("#budget"), startEl = $("#start");
  function rowHtml(d, i) {
    return '<tr data-i="' + i + '"><td data-l="Name"><input data-k="name" value="' + esc(d.name || "") + '" placeholder="Card" aria-label="Debt name"></td>' +
      '<td data-l="Balance $"><input data-k="balance" type="number" inputmode="decimal" min="0" step="1" value="' + (d.balance === "" ? "" : d.balance) + '" aria-label="Balance"></td>' +
      '<td data-l="APR %"><input data-k="apr" type="number" inputmode="decimal" min="0" step="0.01" value="' + (d.apr === "" ? "" : d.apr) + '" aria-label="APR"></td>' +
      '<td data-l="Minimum $"><input data-k="minimum" type="number" inputmode="decimal" min="0" step="1" value="' + (d.minimum === "" ? "" : d.minimum) + '" aria-label="Minimum payment"></td>' +
      '<td class="x"><button type="button" aria-label="Remove">×</button></td></tr>';
  }
  function renderRows() { tbody.innerHTML = state.debts.map(rowHtml).join(""); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }

  function debtsForEngine() {
    return state.debts.filter(function (d) { return num(d.balance) > 0; }).map(function (d) {
      var apr = num(d.apr) / 100;
      return { name: d.name || "Debt", balance: num(d.balance), apr: apr, minimum: num(d.minimum) };
    });
  }

  function chart(sims, maxMonths) {
    var W = 560, H = 220, P = 30, start = sims.snowball.balances.length ? debtsForEngine().reduce(function (a, d) { return a + d.balance; }, 0) : 0;
    if (!start) return "";
    var line = function (s, color, dash) {
      var pts = [[0, start]].concat(s.balances.slice(0, maxMonths).map(function (b, k) { return [k + 1, b]; }));
      var d = pts.map(function (p, k) { return (k ? "L" : "M") + (P + (p[0] / maxMonths) * (W - P - 8)).toFixed(1) + " " + (8 + (1 - p[1] / start) * (H - P - 8)).toFixed(1); }).join(" ");
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="5 5"' : "") + "/>";
    };
    var grid = "";
    for (var g = 0; g <= 4; g++) { var y = 8 + g * (H - P - 8) / 4; grid += '<line x1="' + P + '" x2="' + (W - 8) + '" y1="' + y + '" y2="' + y + '" stroke="#e5e5ea"/>'; }
    var years = Math.max(1, Math.round(maxMonths / 12));
    var xl = '<text x="' + P + '" y="' + (H - 8) + '" font-size="12" fill="#86868b">Now</text><text x="' + (W - 8) + '" y="' + (H - 8) + '" font-size="12" fill="#86868b" text-anchor="end">' + years + (years === 1 ? " year" : " years") + "</text>";
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Total debt over time">' + grid + xl +
      line(sims.minimum, "#ff3b30", true) + line(sims.snowball, "#0071e3") + line(sims.avalanche, "#34c759") + "</svg>";
  }

  function compute() {
    var debts = debtsForEngine(), budget = num(state.budget), warn = $("#warn"), res = $("#results");
    var ym = (state.start || SAMPLE.start).split("-"), sy = parseInt(ym[0], 10) || 2026, sm = parseInt(ym[1], 10) || 1;
    var mins = debts.reduce(function (a, d) { return a + d.minimum; }, 0);
    if (!debts.length) {
      warn.textContent = "Add at least one debt with a balance.";
      res.innerHTML = ""; $("#verdict").textContent = ""; $("#chart").innerHTML = ""; $("#order").innerHTML = "";
      return;
    }
    warn.className = "warn" + (budget < mins ? "" : " ok");
    warn.textContent = budget < mins ? "Your monthly amount is below your minimums (" + money(mins) + "). Raise it to see a real plan."
      : "Extra toward debt every month: " + money(budget - mins) + ".";
    var sims = { snowball: E.simulate(debts, budget, "snowball"), avalanche: E.simulate(debts, budget, "avalanche"), minimum: E.simulate(debts, budget, "minimum") };
    var best = sims.avalanche.totalInterest <= sims.snowball.totalInterest ? "avalanche" : "snowball";
    var card = function (key, title, color) {
      var s = sims[key], m = s.debtFreeMonth;
      return '<div class="res' + (key === best ? " best" : "") + '"><div class="name"><i style="background:' + color + '"></i>' + title + '</div><span class="tag">Least interest</span>' +
        '<div class="date">' + E.monthLabel(sy, sm, m) + '</div><div class="meta">' + (m ? m + " months · " : "Not within 30 years · ") + money(s.totalInterest) + " interest</div></div>";
    };
    res.innerHTML = card("snowball", "Snowball", "#0071e3") + card("avalanche", "Avalanche", "#34c759") + card("minimum", "Minimums only", "#ff3b30");
    var diff = Math.abs(sims.snowball.totalInterest - sims.avalanche.totalInterest), v = "";
    if (diff >= 1) v = (best === "avalanche" ? "Avalanche" : "Snowball") + " saves you " + money(diff) + " in interest.";
    else v = "Both methods cost about the same interest.";
    if (sims.snowball.firstWin && sims.avalanche.firstWin && sims.snowball.firstWin < sims.avalanche.firstWin)
      v += " Snowball clears your first debt " + (sims.avalanche.firstWin - sims.snowball.firstWin) + " month" + (sims.avalanche.firstWin - sims.snowball.firstWin === 1 ? "" : "s") + " sooner.";
    $("#verdict").textContent = v;
    var span = Math.min(E.HORIZON, Math.max(sims[best].debtFreeMonth || 120, Math.min(sims.minimum.debtFreeMonth || 120, 120)));
    $("#chart").innerHTML = chart(sims, span);
    $("#orderTitle").textContent = "Payoff order · " + (best === "avalanche" ? "Avalanche" : "Snowball");
    $("#order").innerHTML = sims[best].order.map(function (i) {
      return "<li><span>" + esc(debts[i].name) + "</span><span>" + E.monthLabel(sy, sm, sims[best].payoffMonth[i]) + "</span></li>";
    }).join("");
    window.__dmLast = { sims: sims, best: best, start: [sy, sm] };
  }

  function readInputs() {
    tbody.querySelectorAll("tr").forEach(function (tr) {
      var d = state.debts[+tr.getAttribute("data-i")];
      tr.querySelectorAll("input").forEach(function (inp) { var k = inp.getAttribute("data-k"); d[k] = k === "name" ? inp.value : inp.value === "" ? "" : parseFloat(inp.value); });
    });
    state.budget = budgetEl.value === "" ? 0 : parseFloat(budgetEl.value);
    state.start = startEl.value || SAMPLE.start;
  }
  var timer = null;
  function onChange() { clearTimeout(timer); timer = setTimeout(function () { readInputs(); save(); compute(); }, 120); }

  budgetEl.value = state.budget; startEl.value = state.start;
  renderRows(); compute();
  document.addEventListener("input", function (e) { if (e.target.closest("#calculator")) onChange(); });
  tbody.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    readInputs(); state.debts.splice(+b.closest("tr").getAttribute("data-i"), 1); renderRows(); save(); compute();
  });
  $("#add").addEventListener("click", function () {
    if (state.debts.length >= 10) return;
    readInputs(); state.debts.push({ name: "", balance: "", apr: "", minimum: "" }); renderRows(); save();
    var last = tbody.querySelector("tr:last-child input"); if (last) last.focus();
  });
})();
