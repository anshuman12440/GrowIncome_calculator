const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readStocks() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read data file:', err);
    return [];
  }
}

function writeStocks(stocks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(stocks, null, 2));
}

function calculateRow(stock) {
  const buyTotal = stock.quantity * stock.buyPrice;
  const sellTotal = stock.quantity * stock.sellPrice;
  const profitLoss = sellTotal - buyTotal;
  const profitLossPct = buyTotal > 0 ? (profitLoss / buyTotal) * 100 : 0;
  return { ...stock, buyTotal, sellTotal, profitLoss, profitLossPct };
}

app.get('/api/stocks', (req, res) => {
  const stocks = readStocks().map(calculateRow);

  const totalInvested = stocks.reduce((sum, s) => sum + s.buyTotal, 0);
  const totalReturned = stocks.reduce((sum, s) => sum + s.sellTotal, 0);
  const netProfitLoss = totalReturned - totalInvested;
  const overallReturnPct = totalInvested > 0 ? (netProfitLoss / totalInvested) * 100 : 0;

  res.json({
    stocks,
    summary: { totalInvested, totalReturned, netProfitLoss, overallReturnPct }
  });
});

app.post('/api/stocks', (req, res) => {
  const { name, quantity, buyPrice, sellPrice } = req.body;

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

  const stocks = readStocks();
  const newStock = {
    id: Date.now().toString(),
    name: name.trim().toUpperCase(),
    quantity: qty,
    buyPrice: bp,
    sellPrice: sp,
    createdAt: new Date().toISOString()
  };
  stocks.push(newStock);
  writeStocks(stocks);
  res.status(201).json(calculateRow(newStock));
});

app.delete('/api/stocks/:id', (req, res) => {
  const { id } = req.params;
  const stocks = readStocks();
  const filtered = stocks.filter(s => s.id !== id);
  if (filtered.length === stocks.length) {
    return res.status(404).json({ error: 'Stock not found' });
  }
  writeStocks(filtered);
  res.json({ success: true });
});

app.delete('/api/stocks', (req, res) => {
  writeStocks([]);
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.json({ message: 'Groww Income API', endpoints: ['/api/stocks'] });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
