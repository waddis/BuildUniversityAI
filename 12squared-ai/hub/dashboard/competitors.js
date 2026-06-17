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
    return tiers.find(t => !t.quoteOnly &&
      (t.monthlyCents !== null || t.annualTotalCents !== null)) || tiers[0];
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

  const api = { costAtUsers, fmtMoney, daysSince };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Competitors = api;
})(typeof window !== "undefined" ? window : this);
