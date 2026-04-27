const rates = require('../charges');

const round2 = (n) => Math.round(n * 100) / 100;

function calculateCharges(buyValue, sellValue, tradeType = 'delivery') {
  const r = rates[tradeType];
  if (!r) throw new Error(`Unknown tradeType: ${tradeType}`);

  const turnover = buyValue + sellValue;

  // Brokerage — equity uses min(flat, %); options uses flat only
  let brokerage;
  if (tradeType === 'options') {
    brokerage = r.brokerageFlat * 2;
  } else {
    const buyBrokerage = Math.min(r.brokerageMax, buyValue * r.brokeragePct);
    const sellBrokerage = Math.min(r.brokerageMax, sellValue * r.brokeragePct);
    brokerage = buyBrokerage + sellBrokerage;
  }

  const stt = buyValue * r.sttBuyPct + sellValue * r.sttSellPct;
  const exchange = turnover * r.exchangePct;
  const sebi = turnover * r.sebiPct;
  const stampDuty = buyValue * r.stampDutyPct;
  const gst = (brokerage + exchange + sebi) * r.gstPct;

  const total = brokerage + stt + exchange + sebi + stampDuty + gst;
  const grossPL = sellValue - buyValue;
  const netPL = grossPL - total;
  const netPLPct = buyValue > 0 ? (netPL / buyValue) * 100 : 0;

  return {
    brokerage: round2(brokerage),
    stt: round2(stt),
    exchange: round2(exchange),
    sebi: round2(sebi),
    stampDuty: round2(stampDuty),
    gst: round2(gst),
    total: round2(total),
    grossPL: round2(grossPL),
    netPL: round2(netPL),
    netPLPct: round2(netPLPct)
  };
}

module.exports = calculateCharges;
