require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Stock = require('./models/Stock');
const SummaryOverride = require('./models/SummaryOverride');
const calculateCharges = require('./utils/calculateCharges');

const VALID_TRADE_TYPES = ['delivery', 'intraday', 'options'];

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connectDB();

function calculateRow(stock) {
  if (stock.entryType === 'manual') {
    const fallbackAmount = Number(stock.manualAmount) || 0;
    const manualGrossPL = Number.isFinite(Number(stock.manualGrossPL)) ? Number(stock.manualGrossPL) : fallbackAmount;
    const manualNetPL = Number.isFinite(Number(stock.manualNetPL)) ? Number(stock.manualNetPL) : manualGrossPL;

    return {
      id: stock._id.toString(),
      entryType: 'manual',
      name: stock.name,
      quantity: null,
      buyPrice: null,
      sellPrice: null,
      tradeType: 'manual',
      manualAmount: manualNetPL,
      manualGrossPL,
      manualNetPL,
      createdAt: stock.createdAt,
      buyTotal: 0,
      sellTotal: 0,
      profitLoss: manualGrossPL,
      profitLossPct: 0,
      charges: {
        brokerage: 0,
        stt: 0,
        exchange: 0,
        sebi: 0,
        stampDuty: 0,
        gst: 0,
        total: 0,
        grossPL: manualGrossPL,
        netPL: manualNetPL,
        netPLPct: 0
      }
    };
  }

  const buyTotal = stock.quantity * stock.buyPrice;
  const sellTotal = stock.quantity * stock.sellPrice;
  const tradeType = stock.tradeType || 'delivery';
  const charges = calculateCharges(buyTotal, sellTotal, tradeType);

  return {
    id: stock._id.toString(),
    entryType: stock.entryType || 'stock',
    name: stock.name,
    quantity: stock.quantity,
    buyPrice: stock.buyPrice,
    sellPrice: stock.sellPrice,
    tradeType,
    createdAt: stock.createdAt,
    buyTotal,
    sellTotal,
    profitLoss: charges.grossPL,
    profitLossPct: buyTotal > 0 ? (charges.grossPL / buyTotal) * 100 : 0,
    charges
  };
}

app.get('/api/stocks', async (req, res) => {
  try {
    const docs = await Stock.find().sort({ createdAt: 1 });
    const stocks = docs.map(calculateRow);

    const totalInvested = stocks.reduce((sum, s) => sum + s.buyTotal, 0);
    const totalReturned = stocks.reduce((sum, s) => sum + s.sellTotal, 0);
    const totalCharges = stocks.reduce((sum, s) => sum + s.charges.total, 0);
    const calculatedGrossProfitLoss = stocks.reduce((sum, s) => sum + s.profitLoss, 0);
    const calculatedNetProfitLoss = stocks.reduce((sum, s) => sum + s.charges.netPL, 0);
    const override = await SummaryOverride.findOne({ key: 'main' });
    const grossProfitLoss = Number.isFinite(override?.grossProfitLoss)
      ? override.grossProfitLoss
      : calculatedGrossProfitLoss;
    const netProfitLoss = Number.isFinite(override?.netProfitLoss)
      ? override.netProfitLoss
      : calculatedNetProfitLoss;
    const overallReturnPct = totalInvested > 0 ? (netProfitLoss / totalInvested) * 100 : 0;

    res.json({
      stocks,
      summary: {
        totalInvested,
        totalReturned,
        totalCharges: Math.round(totalCharges * 100) / 100,
        grossProfitLoss,
        netProfitLoss: Math.round(netProfitLoss * 100) / 100,
        overallReturnPct: Math.round(overallReturnPct * 100) / 100,
        calculatedGrossProfitLoss: Math.round(calculatedGrossProfitLoss * 100) / 100,
        calculatedNetProfitLoss: Math.round(calculatedNetProfitLoss * 100) / 100,
        isSummaryEdited: Boolean(override)
      }
    });
  } catch (err) {
    console.error('GET /api/stocks failed:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

app.post('/api/stocks', async (req, res) => {
  const { entryType, name, quantity, buyPrice, sellPrice, tradeType, manualAmount, manualType, manualGrossPL, manualNetPL } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Entry name is required' });
  }

  if (entryType === 'manual') {
    let grossPL = Number(manualGrossPL);
    let netPL = Number(manualNetPL);

    if (!Number.isFinite(grossPL) || !Number.isFinite(netPL)) {
      const amount = Number(manualAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Manual gross and net P&L must be valid numbers' });
      }
      if (!['profit', 'loss'].includes(manualType)) {
        return res.status(400).json({ error: 'Manual type must be profit or loss' });
      }
      grossPL = manualType === 'loss' ? -amount : amount;
      netPL = grossPL;
    }

    try {
      const doc = await Stock.create({
        entryType: 'manual',
        name: name.trim(),
        manualAmount: netPL,
        manualGrossPL: grossPL,
        manualNetPL: netPL
      });
      return res.status(201).json(calculateRow(doc));
    } catch (err) {
      console.error('POST /api/stocks manual failed:', err);
      return res.status(500).json({ error: 'Failed to create manual P&L entry' });
    }
  }

  const qty = Number(quantity);
  const bp = Number(buyPrice);
  const sp = Number(sellPrice);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }
  if (!Number.isFinite(bp) || bp < 0) {
    return res.status(400).json({ error: 'Buy price must be a non-negative number' });
  }
  if (!Number.isFinite(sp) || sp < 0) {
    return res.status(400).json({ error: 'Sell price must be a non-negative number' });
  }
  const tt = tradeType || 'delivery';
  if (!VALID_TRADE_TYPES.includes(tt)) {
    return res.status(400).json({ error: `tradeType must be one of: ${VALID_TRADE_TYPES.join(', ')}` });
  }

  try {
    const doc = await Stock.create({
      entryType: 'stock',
      name: name.trim(),
      quantity: qty,
      buyPrice: bp,
      sellPrice: sp,
      tradeType: tt
    });
    res.status(201).json(calculateRow(doc));
  } catch (err) {
    console.error('POST /api/stocks failed:', err);
    res.status(500).json({ error: 'Failed to create stock' });
  }
});

app.put('/api/summary', async (req, res) => {
  const grossProfitLoss = Number(req.body.grossProfitLoss);
  const netProfitLoss = Number(req.body.netProfitLoss);

  if (!Number.isFinite(grossProfitLoss) || !Number.isFinite(netProfitLoss)) {
    return res.status(400).json({ error: 'Gross and net P&L must be valid numbers' });
  }

  try {
    const override = await SummaryOverride.findOneAndUpdate(
      { key: 'main' },
      { key: 'main', grossProfitLoss, netProfitLoss },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({
      grossProfitLoss: override.grossProfitLoss,
      netProfitLoss: override.netProfitLoss
    });
  } catch (err) {
    console.error('PUT /api/summary failed:', err);
    res.status(500).json({ error: 'Failed to update summary' });
  }
});

app.delete('/api/summary', async (_req, res) => {
  try {
    await SummaryOverride.deleteOne({ key: 'main' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/summary failed:', err);
    res.status(500).json({ error: 'Failed to reset summary' });
  }
});

app.put('/api/stocks/:id', async (req, res) => {
  const { id } = req.params;
  const { name, manualGrossPL, manualNetPL } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid stock id' });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Entry name is required' });
  }

  const grossPL = Number(manualGrossPL);
  const netPL = Number(manualNetPL);
  if (!Number.isFinite(grossPL) || !Number.isFinite(netPL)) {
    return res.status(400).json({ error: 'Manual gross and net P&L must be valid numbers' });
  }

  try {
    const updated = await Stock.findOneAndUpdate(
      { _id: id, entryType: 'manual' },
      {
        name: name.trim(),
        manualAmount: netPL,
        manualGrossPL: grossPL,
        manualNetPL: netPL
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Manual entry not found' });
    res.json(calculateRow(updated));
  } catch (err) {
    console.error('PUT /api/stocks/:id failed:', err);
    res.status(500).json({ error: 'Failed to update manual P&L entry' });
  }
});

app.delete('/api/stocks/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid stock id' });
  }
  try {
    const deleted = await Stock.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Stock not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/stocks/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

app.delete('/api/stocks', async (req, res) => {
  try {
    await Stock.deleteMany({});
    await SummaryOverride.deleteOne({ key: 'main' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/stocks failed:', err);
    res.status(500).json({ error: 'Failed to clear stocks' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Groww Income API', endpoints: ['/api/stocks'] });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
