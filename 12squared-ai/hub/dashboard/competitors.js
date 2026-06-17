(function (root) {
  function fmtMoney(cents) {
    if (cents === null || cents === undefined) return "—";
    const dollars = cents / 100;
    const opts = Number.isInteger(dollars)
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return "$" + dollars.toLocaleString("en-US", opts);
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
      return { id: v.id, name: v.name, category: v.category,
        monthlyCents: c.monthlyCents, tierName: c.tierName };
    });
    const suiteTotal = suiteItems.reduce((s, i) => s + (i.monthlyCents || 0), 0);

    const stackItems = [], alternatives = [], quoteOnly = [];
    for (const cat of cats) {
      const rivals = doc.competitors
        .filter(v => v.category === cat)
        .map(v => { const c = costAtUsers(v, n);
          return { id: v.id, name: v.name, category: cat, monthlyCents: c.monthlyCents, tierName: c.tierName }; });
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

  // Cost of a SPECIFIC chosen tier (the user picked it) under the vendor's
  // seat model — for the interactive "what they have" basket. Unlike
  // costAtUsers, it does not auto-select a tier.
  function costForTier(vendor, tier, n) {
    const m = vendor.seatModel;
    if (!tier || tier.quoteOnly)
      return { monthlyCents: null, tierName: tier ? tier.name : null, seatMath: "Contact sales", warn: null };
    if (m === "PER_SEAT") {
      if (tier.monthlyCents === null) return { monthlyCents: null, tierName: tier.name, seatMath: "—", warn: null };
      const extra = Math.max(0, n - (tier.includedSeats || 0));
      const monthly = tier.monthlyCents + extra * (tier.additionalSeatCents || 0);
      return { monthlyCents: monthly, tierName: tier.name,
        seatMath: `${fmtMoney(tier.monthlyCents)} base (incl. ${tier.includedSeats || 0}) + ${extra} × ${fmtMoney(tier.additionalSeatCents)} = ${fmtMoney(monthly)}/mo`,
        warn: null };
    }
    if (m === "FLAT_SEAT_CAP") {
      const warn = (tier.seatCap && n > tier.seatCap) ? `over ${tier.seatCap}-seat cap` : null;
      return { monthlyCents: tier.monthlyCents, tierName: tier.name,
        seatMath: `flat ${fmtMoney(tier.monthlyCents)}/mo (${tier.name})`, warn };
    }
    if (m === "FLAT_CONCURRENCY" || m === "FLAT_ANNUAL") {
      if (tier.annualTotalCents === null) return { monthlyCents: null, tierName: tier.name, seatMath: "—", warn: null };
      const monthly = Math.round(tier.annualTotalCents / 12);
      const note = (m === "FLAT_CONCURRENCY" && tier.concurrency) ? ` · ${tier.concurrency} concurrent` : "";
      return { monthlyCents: monthly, tierName: tier.name,
        seatMath: `${fmtMoney(tier.annualTotalCents)}/yr ÷ 12 = ${fmtMoney(monthly)}/mo${note}`, warn: null };
    }
    // OWN and anything else: flat monthly, else annual/12
    if (tier.monthlyCents !== null)
      return { monthlyCents: tier.monthlyCents, tierName: tier.name, seatMath: `${fmtMoney(tier.monthlyCents)}/mo`, warn: null };
    if (tier.annualTotalCents !== null) {
      const mo = Math.round(tier.annualTotalCents / 12);
      return { monthlyCents: mo, tierName: tier.name, seatMath: `${fmtMoney(tier.annualTotalCents)}/yr ÷ 12 = ${fmtMoney(mo)}/mo`, warn: null };
    }
    return { monthlyCents: null, tierName: tier.name, seatMath: "—", warn: null };
  }

  // "What they have" — a user-built basket. selection: {vendorId: {included, tierName}}.
  // A 12² product counts in the suite total only when its category has an
  // included competitor (drop-from-both), keeping the comparison apples-to-apples.
  function basketTotals(doc, n, selection) {
    const sel = selection || {};
    const priceOf = v => {
      const s = sel[v.id] || {};
      const tier = v.tiers.find(t => t.name === s.tierName) || firstPriced(v.tiers);
      const c = costForTier(v, tier, n);
      return { id: v.id, name: v.name, category: v.category, tierName: tier.name,
        monthlyCents: c.monthlyCents, warn: c.warn,
        included: sel[v.id] ? sel[v.id].included === true : false };
    };
    const competitors = doc.competitors.map(priceOf);
    const theirs = competitors.filter(x => x.included && x.monthlyCents !== null);
    const activeCats = new Set(theirs.map(x => x.category));
    const suite = doc.twelveSquared.map(priceOf).filter(x => activeCats.has(x.category));
    const theirTotal = theirs.reduce((s, i) => s + i.monthlyCents, 0);
    const suiteTotal = suite.reduce((s, i) => s + (i.monthlyCents || 0), 0);
    const sav = theirTotal - suiteTotal;
    return { competitors, theirs, suite, theirTotal, suiteTotal,
      savingsCents: sav, savingsPct: theirTotal > 0 ? Math.round(sav / theirTotal * 100) : 0,
      activeCategories: [...activeCats] };
  }

  const api = { costAtUsers, costForTier, fmtMoney, daysSince, stackTotals, basketTotals };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Competitors = api;
})(typeof window !== "undefined" ? window : this);
