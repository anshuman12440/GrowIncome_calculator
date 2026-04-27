// Groww brokerage & regulatory charge rates.
// Rates verified against Groww's brokerage calculator screenshots.
// Update these if Groww revises rates.

module.exports = {
  delivery: {
    brokeragePct: 0.001,        // 0.1% of order value
    brokerageMax: 20,           // capped at ₹20 per order
    sttBuyPct: 0.001,           // 0.1% on buy
    sttSellPct: 0.001,          // 0.1% on sell
    exchangePct: 0.0000297,     // 0.00297% on total turnover
    sebiPct: 0.000001,          // ₹10/crore = 0.0001%
    stampDutyPct: 0.00015,      // 0.015% on buy only
    gstPct: 0.18                // 18% on (brokerage + exchange + sebi)
  },
  intraday: {
    brokeragePct: 0.0005,       // 0.05% of order value
    brokerageMax: 20,
    sttBuyPct: 0,
    sttSellPct: 0.00025,        // 0.025% on sell only
    exchangePct: 0.0000297,
    sebiPct: 0.000001,
    stampDutyPct: 0.00003,      // 0.003% on buy only
    gstPct: 0.18
  },
  options: {
    brokerageFlat: 20,          // ₹20 flat per executed order (no % cap)
    sttBuyPct: 0,
    sttSellPct: 0.001,          // 0.1% on sell premium
    exchangePct: 0.000350,      // 0.0350% on total turnover (NSE F&O)
    sebiPct: 0.000001,
    stampDutyPct: 0.00003,      // 0.003% on buy only
    gstPct: 0.18
  }
};
