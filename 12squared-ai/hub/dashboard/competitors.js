(function (root) {
  function fmtMoney(cents) {
    if (cents === null || cents === undefined) return "—";
    const dollars = cents / 100;
    return Number.isInteger(dollars) ? "$" + dollars : "$" + dollars.toFixed(2);
  }

  function daysSince(isoDate, todayIso) {
    const a = new Date(isoDate + "T00:00:00Z").getTime();
    const b = new Date(todayIso + "T00:00:00Z").getTime();
    return Math.round((b - a) / 86400000);
  }

  function firstPriced(tiers) {
    // prefer a real (positive) priced, non-quote tier so a $0 "Free" tier
    // never becomes the representative price; fall back to any priced tier.
    return tiers.find(t => !t.quoteOnly &&
        ((t.monthlyCents !== null && t.monthlyCents > 0) ||
         (t.annualTotalCents !== null && t.annualTotalCents > 0)))
      || tiers.find(t => !t.quoteOnly &&
        (t.monthlyCents !== null || t.annualTotalCents !== null))
      || tiers[0];
  }

  function costAtUsers(vendor, n) {
    const model = vendor.seatModel;
    if (model === "PER_SEAT") {
      const t = firstPriced(vendor.tiers);
      const extra = Math.max(0, n - (t.includedSeats || 0));
      const monthly = t.monthlyCents + extra * (t.additionalSeatCents || 0);
      const inc = t.includedSeats || 0;
      return { monthlyCents: monthly, tierName: t.name,
        explanation: `${t.name}: base incl. ${inc} users, +${fmtMoney(t.additionalSeatCents)}/user`,
        seatMath: `${fmtMoney(t.monthlyCents)} base (incl. ${inc}) + ${extra} × ${fmtMoney(t.additionalSeatCents)} = ${fmtMoney(monthly)}/mo at ${n} users` };
    }
    if (model === "FLAT_SEAT_CAP") {
      const fitting = vendor.tiers
        .filter(t => !t.quoteOnly && t.monthlyCents !== null && (t.seatCap === null || t.seatCap >= n))
        .sort((a, b) => a.monthlyCents - b.monthlyCents)[0];
      if (!fitting) return { monthlyCents: null, tierName: null,
        explanation: "no tier covers this team size", seatMath: "contact sales" };
      return { monthlyCents: fitting.monthlyCents, tierName: fitting.name,
        explanation: `${fitting.name}: flat, no per-seat charge`,
        seatMath: `flat ${fmtMoney(fitting.monthlyCents)}/mo (${fitting.name}${fitting.seatCap ? ", up to " + fitting.seatCap + " seats" : ", unlimited seats"})` };
    }
    if (model === "FLAT_CONCURRENCY") {
      const t = firstPriced(vendor.tiers);
      const monthly = Math.round(t.annualTotalCents / 12);
      return { monthlyCents: monthly, tierName: t.name,
        explanation: `${t.name}: annual, ${t.concurrency} concurrent sessions (not per-user)`,
        seatMath: `${fmtMoney(t.annualTotalCents)}/yr ÷ 12 = ${fmtMoney(monthly)}/mo · ${t.concurrency} concurrent (not per-user)` };
    }
    if (model === "FLAT_ANNUAL") {
      const t = firstPriced(vendor.tiers);
      const monthly = Math.round(t.annualTotalCents / 12);
      return { monthlyCents: monthly, tierName: t.name,
        explanation: `${t.name}: flat annual price`,
        seatMath: `${fmtMoney(t.annualTotalCents)}/yr ÷ 12 = ${fmtMoney(monthly)}/mo (flat, annual)` };
    }
    if (model === "OWN") {
      const t = firstPriced(vendor.tiers);
      if (t.quoteOnly || t.monthlyCents === null)
        return { monthlyCents: null, tierName: t.name, explanation: "internal", seatMath: "—" };
      return { monthlyCents: t.monthlyCents, tierName: t.name,
        explanation: `${t.name}`, seatMath: `${fmtMoney(t.monthlyCents)}/mo` };
    }
    // QUOTE_ONLY and anything else
    return { monthlyCents: null, tierName: null,
      explanation: "Contact sales — no public price", seatMath: "Contact sales" };
  }

  // Build "the stack a buyer would assemble to match the 12² suite" vs the
  // suite itself, at n users. One competitor per category (cheapest priced),
  // so hail is never double-counted; pricier rivals become alternatives and
  // unpriced rivals are listed as quote-only (not summed).
  function stackTotals(doc, n) {
    const cats = ["photo_docs", "hail_data", "code_reports"];

    const suiteItems = doc.twelveSquared.map(v => {
      const c = costAtUsers(v, n);
      return { name: v.name, category: v.category,
        monthlyCents: c.monthlyCents, tierName: c.tierName };
    });
    const suiteTotal = suiteItems.reduce((s, i) => s + (i.monthlyCents || 0), 0);

    const stackItems = [], alternatives = [], quoteOnly = [];
    for (const cat of cats) {
      const rivals = doc.competitors
        .filter(v => v.category === cat)
        .map(v => { const c = costAtUsers(v, n);
          return { name: v.name, category: cat, monthlyCents: c.monthlyCents, tierName: c.tierName }; });
      rivals.filter(r => r.monthlyCents === null).forEach(r => quoteOnly.push(r.name));
      const priced = rivals.filter(r => r.monthlyCents !== null)
        .sort((a, b) => a.monthlyCents - b.monthlyCents);
      if (priced.length) {
        stackItems.push(priced[0]);
        priced.slice(1).forEach(r => alternatives.push(r));
      }
    }
    const stackTotal = stackItems.reduce((s, i) => s + i.monthlyCents, 0);
    const savings = stackTotal - suiteTotal;
    return {
      suite: { items: suiteItems, totalCents: suiteTotal },
      stack: { items: stackItems, totalCents: stackTotal, alternatives, quoteOnly },
      savingsCents: savings,
      savingsPct: stackTotal > 0 ? Math.round((savings / stackTotal) * 100) : 0,
    };
  }

  const api = { costAtUsers, fmtMoney, daysSince, stackTotals };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Competitors = api;
})(typeof window !== "undefined" ? window : this);
