/* Dollar Math · debt payoff engine for the web calculator.
   Same business rules as product/model.py and the Money Dashboard workbook (see those files):
   monthly interest = ROUND(balance * APR / 12, 2) charged before paying; every open debt gets its minimum
   (capped at what it owes); the rest of the monthly budget goes to debts in priority order and whatever a debt
   does not need flows to the next one in the same month. Snowball = smallest starting balance first,
   Avalanche = highest APR first, ties keep list order. Minimum-only = no extra, nothing rolled over.
   Money is integer cents, so results match the spreadsheet to the cent. Runs in the browser and in Node. */
(function (root) {
  "use strict";
  var HORIZON = 360;
  function cents(x) { return Math.floor(Number(x) * 100 + 0.5 + 1e-9); }
  function halfUp(x) { return Math.floor(x + 0.5 + 1e-9); }

  function priorityOrder(debts, strategy) {
    var idx = [];
    for (var i = 0; i < debts.length; i++) if (debts[i].balance > 0) idx.push(i);
    var key = function (i) {
      if (strategy === "snowball") return debts[i].balance;
      if (strategy === "avalanche") return -debts[i].apr;
      var p = debts[i].priority;
      return p === null || p === undefined || p === "" ? 999 : Number(p);
    };
    return idx.sort(function (a, b) { return key(a) - key(b) || a - b; });
  }

  function simulate(debts, budget, strategy, opts) {
    opts = opts || {};
    var horizon = opts.horizon || HORIZON, lumps = opts.lumps || {};
    var n = debts.length, bal = [], minC = [], payoff = {}, i, m;
    for (i = 0; i < n; i++) {
      bal.push(debts[i].balance > 0 ? cents(debts[i].balance) : 0);
      minC.push(cents(Math.max(0, Number(debts[i].minimum) || 0)));
      if (debts[i].balance > 0) payoff[i] = null;
    }
    var order = strategy === "minimum" ? [] : priorityOrder(debts, strategy);
    var totalInterest = 0, totalPaid = 0, balances = [], paidOrder = [];
    for (m = 1; m <= horizon; m++) {
      var interest = [], due = [], pay = [], sumPay = 0;
      for (i = 0; i < n; i++) {
        interest.push(bal[i] > 0 ? halfUp(bal[i] * debts[i].apr / 12) : 0);
        due.push(bal[i] + interest[i]);
        pay.push(due[i] > 0 ? Math.min(minC[i], due[i]) : 0);
        sumPay += pay[i];
      }
      if (strategy !== "minimum") {
        var pool = Math.max(0, cents(budget) + cents(lumps[m] || 0) - sumPay);
        for (var k = 0; k < order.length && pool > 0; k++) {
          var j = order[k], add = Math.min(pool, due[j] - pay[j]);
          pay[j] += add; pool -= add;
        }
      }
      var total = 0;
      for (i = 0; i < n; i++) {
        if (!(debts[i].balance > 0)) continue;
        var wasOpen = bal[i] > 0;
        bal[i] = due[i] - pay[i];
        totalInterest += interest[i]; totalPaid += pay[i];
        if (wasOpen && bal[i] <= 0 && payoff[i] === null) { payoff[i] = m; paidOrder.push(i); }
        total += bal[i];
      }
      balances.push(total / 100);
    }
    var months = Object.keys(payoff).map(function (k2) { return payoff[k2]; });
    var done = months.filter(function (v) { return v !== null; });
    return {
      strategy: strategy,
      payoffMonth: payoff,
      debtFreeMonth: months.length && done.length === months.length ? Math.max.apply(null, done) : null,
      firstWin: done.length ? Math.min.apply(null, done) : null,
      totalInterest: totalInterest / 100,
      totalPaid: totalPaid / 100,
      order: paidOrder,
      balances: balances
    };
  }

  function monthLabel(startYear, startMonth, index, long) {
    if (index === null || index === undefined) return "30+ years";
    var t = startYear * 12 + (startMonth - 1) + index - 1, y = Math.floor(t / 12), mo = t % 12;
    var names = long ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[mo] + " " + y;
  }

  var api = { simulate: simulate, priorityOrder: priorityOrder, monthLabel: monthLabel, HORIZON: HORIZON };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DMEngine = api;
})(typeof window !== "undefined" ? window : this);
