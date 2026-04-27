require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Stock = require('./models/Stock');
const calculateCharges = require('./utils/calculateCharges');

const VALID_TRADE_TYPES = ['delivery', 'intraday', 'options'];

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connectDB();

function calculateRow(stock) {
  const buyTotal = stock.quantity * stock.buyPrice;
  const sellTotal = stock.quantity * stock.sellPrice;
  const tradeType = stock.tradeType || 'delivery';
  const charges = calculateCharges(buyTotal, sellTotal, tradeType);

  return {
    id: stock._id.toString(),
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
    const grossProfitLoss = totalReturned - totalInvested;
    const netProfitLoss = grossProfitLoss - totalCharges;
    const overallReturnPct = totalInvested > 0 ? (netProfitLoss / totalInvested) * 100 : 0;

    res.json({
      stocks,
      summary: {
        totalInvested,
        totalReturned,
        totalCharges: Math.round(totalCharges * 100) / 100,
        grossProfitLoss,
        netProfitLoss: Math.round(netProfitLoss * 100) / 100,
        overallReturnPct: Math.round(overallReturnPct * 100) / 100
      }
    });
  } catch (err) {
    console.error('GET /api/stocks failed:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

app.post('/api/stocks', async (req, res) => {
  const { name, quantity, buyPrice, sellPrice, tradeType } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Stock name is required' });
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
